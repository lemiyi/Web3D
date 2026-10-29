import type * as GeoJSON from 'geojson'
import type { SkySpecification, StyleSpecification } from 'maplibre-gl'
import pays from '@/content/geo/pays.geo.json'
import regionsGeo from '@/content/geo/regions.geo.json'
import { type Calques, CALQUES_DEFAUT, type Fond } from './calques'
import {
  type Lumiere,
  melanger,
  type Reglages,
  reglagesLumiere,
  transparent,
} from './lumiere'
import { NB_BANDES, SEUILS, URL_TERRARIUM } from './relief'

const geo = (d: unknown) => d as GeoJSON.FeatureCollection

// Imagerie Sentinel-2 sans nuages (EOX), mosaïque 2024 à 10 m. Gratuite pour un usage non commercial
// (projets universitaires compris) à condition que le crédit reste visible sur la carte.
const URL_SATELLITE =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg'
// Lumières nocturnes réelles (NASA Black Marble 2016, domaine public), au-dessus de la photo assombrie.
const URL_NUIT =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'
export const CREDIT_NUIT =
  'Lumières nocturnes : NASA Earth Observatory, Black Marble 2016'

// Un rectangle sur toute la fenêtre : il porte la couleur de l'heure (dorée le soir, bleue la nuit).
const monde: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-30, -10],
        [30, -10],
        [30, 40],
        [-30, 40],
        [-30, -10],
      ],
    ],
  },
}

export const CREDIT_SATELLITE =
  'EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)'

// Les détails (courbes, rivières, lacs, voisins) sont des fichiers à part : ils se chargent en parallèle du reste.
export const fichier = (nom: string) =>
  new URL(`${import.meta.env.BASE_URL}geo/${nom}.geo.json`, window.location.href).href

// Le monde moins le Burkina : ce voile estompe tout ce qui est hors du pays, le Burkina reste net.
const trous = (
  (pays as unknown as GeoJSON.FeatureCollection).features[0]
    .geometry as GeoJSON.MultiPolygon
).coordinates.map((polygone) => polygone[0])
const exterieur: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-180, -85],
        [180, -85],
        [180, 85],
        [-180, 85],
        [-180, -85],
      ],
      ...trous,
    ],
  },
}

// MapLibre exige des couleurs littérales : on les lit dans les variables du thème en cours.
function lireCouleurs() {
  const css = getComputedStyle(document.documentElement)
  const v = (nom: string) => css.getPropertyValue(nom).trim()
  return {
    page: v('--bg'),
    texte: v('--text'),
    surface: v('--surface'),
    encre: v('--terre-900'),
    clair: v('--terre-50'),
    sable: v('--ocre-300'),
    brume: v('--ocre-100'),
    poussiere: v('--terre-200'),
    ombre: v('--laterite-900'),
    riviere: v('--secondary'),
    eau: v('--map-water'),
    primaire: v('--primary'),
    indigoClair: v('--indigo-300'),
    indigo: v('--indigo-500'),
    foret: v('--savane-700'),
    savane: v('--savane-500'),
    humide: v('--indigo-300'),
    bandes: Array.from({ length: NB_BANDES }, (_, i) => v(`--relief-${i}`)),
  }
}
type Couleurs = ReturnType<typeof lireCouleurs>

const AUCUNE_DONNEE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

const visible = (actif: boolean) => ({ visibility: actif ? 'visible' : 'none' }) as const
const selonZoom = (...paires: number[]) =>
  ['interpolate', ['linear'], ['zoom'], ...paires] as never

// Ce qui change d'un fond à l'autre : les couleurs des tracés, du voile et de l'eau.
function palette(fond: Fond, c: Couleurs, calques: Calques) {
  if (fond === 'satellite') {
    // Eau naturelle vue du ciel : un bleu-vert profond, posé en transparence sur l'image.
    const eau = melanger(c.indigo, c.foret, 0.35)
    return {
      fond: c.encre,
      trait: c.clair,
      traitOpacite: 0.55,
      courbe: c.clair,
      courbeOpacite: [0.16, 0.3],
      eauLigne: eau,
      eauSurface: eau,
      eauSurfaceOpacite: selonZoom(5, 0.55, 9, 0.35, 12, 0.12),
      voile: c.encre,
      voileOpacite: calques.voisins ? 0.48 : 0.92,
      halo: c.clair,
      haloOpacite: 0.22,
    }
  }
  return {
    fond: c.page,
    trait: c.encre,
    traitOpacite: 0.5,
    courbe: c.encre,
    courbeOpacite: [0.22, 0.42],
    eauLigne: c.riviere,
    eauSurface: c.eau,
    eauSurfaceOpacite: 1 as never,
    voile: c.page,
    voileOpacite: calques.voisins ? 0.6 : 1,
    halo: c.primaire,
    haloOpacite: 0.3,
  }
}

// Le ciel visible en vue inclinée : brume sèche de l'harmattan le jour, embrasement le soir, bleu profond la nuit.
function ciel(r: Reglages): SkySpecification {
  return {
    'sky-color': r.ciel.haut,
    'horizon-color': r.ciel.horizon,
    'fog-color': r.ciel.brouillard,
    'sky-horizon-blend': 0.7,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': selonZoom(6, 0.8, 11, 0.55),
    'atmosphere-blend': selonZoom(5, 0.9, 11, 0.6, 14, 0.2),
  }
}

// Fond « carte » : l'échelle d'altitude en couleurs et la végétation en aplats.
function fondCarte(c: Couleurs, calques: Calques) {
  const dernier = NB_BANDES - 1
  // Bandes franches pour le Burkina (200 à 450 m), puis dégradé vers le clair pour les montagnes voisines.
  const reliefParBandes = c.bandes.flatMap((couleur, i) => {
    const debut = i === 0 ? 0 : SEUILS[i - 1]
    const fin = i === dernier ? 700 : SEUILS[i] - 0.5
    return [debut, couleur, fin, couleur]
  })
  const hauteurs = [
    1100,
    melanger(c.bandes[dernier], c.clair, 0.35),
    1800,
    melanger(c.bandes[dernier], c.clair, 0.6),
    3200,
    melanger(c.bandes[dernier], c.clair, 0.85),
  ]
  const zone = (k: string, couleur: string, opacite: number) => ({
    id: `veg-${k}`,
    type: 'fill' as const,
    source: 'vegetation',
    filter: ['==', ['get', 'k'], k] as never,
    layout: visible(calques.vegetation),
    paint: { 'fill-color': couleur, 'fill-opacity': opacite },
  })
  return [
    {
      id: 'relief-couleur',
      type: 'color-relief' as const,
      source: 'relief',
      layout: visible(calques.relief),
      paint: {
        'color-relief-color': [
          'interpolate',
          ['linear'],
          ['elevation'],
          -11000,
          c.eau,
          -1,
          c.eau,
          ...reliefParBandes,
          ...hauteurs,
        ] as never,
      },
    },
    zone('nu', c.sable, 0.4),
    zone('epars', c.savane, 0.3),
    zone('dense', c.foret, 0.5),
    zone('humide', c.humide, 0.55),
    {
      id: 'ombrage',
      type: 'hillshade' as const,
      source: 'relief',
      layout: visible(calques.relief),
      paint: {
        'hillshade-exaggeration': 0.6,
        'hillshade-shadow-color': c.encre,
        'hillshade-highlight-color': c.clair,
        'hillshade-accent-color': c.ombre,
      },
    },
  ]
}

// Fond « satellite » : la photographie réelle, éclairée selon l'heure, avec un ombrage discret qui creuse le relief.
function fondSatellite(
  c: Couleurs,
  calques: Calques,
  r: Reglages,
  nuitDisponible: boolean,
) {
  return [
    {
      id: 'satellite',
      type: 'raster' as const,
      source: 'satellite',
      paint: {
        'raster-contrast': r.photo.contraste,
        'raster-saturation': r.photo.saturation,
        'raster-brightness-max': r.photo.luminositeMax,
        'raster-hue-rotate': r.photo.teinte,
        'raster-fade-duration': 250,
        'raster-resampling': 'linear' as const,
      },
    },
    {
      id: 'ombrage',
      type: 'hillshade' as const,
      source: 'relief',
      layout: visible(calques.relief),
      paint: {
        'hillshade-method': 'igor' as const,
        'hillshade-exaggeration': 0.45,
        'hillshade-illumination-direction': r.ombre.direction,
        'hillshade-illumination-altitude': r.ombre.hauteur,
        'hillshade-shadow-color': transparent(c.encre, r.ombre.opacite),
        'hillshade-highlight-color': transparent(c.clair, r.ombre.eclat),
        'hillshade-accent-color': transparent(c.encre, 0),
      },
    },
    {
      id: 'teinte',
      type: 'fill' as const,
      source: 'monde',
      layout: visible(r.voile.opacite > 0),
      paint: { 'fill-color': r.voile.couleur, 'fill-opacity': r.voile.opacite },
    },
    {
      id: 'lumieres-nuit',
      type: 'raster' as const,
      source: 'nuit',
      layout: visible(r.nuit > 0 && nuitDisponible),
      paint: { 'raster-opacity': r.nuit, 'raster-fade-duration': 400 },
    },
  ]
}

// Les noms (régions, pays, fleuves, sommets) ne sont pas dans le style : ce sont des étiquettes HTML (src/components/map).
// `detail` est faux au premier affichage : le fond et le relief arrivent d'abord, les détails (eau, courbes,
// végétation) se chargent juste après, une fois la carte dessinée.
export function creerStyleCarte({
  fond = 'satellite',
  lumiere = 'jour',
  calques = CALQUES_DEFAUT,
  detail = true,
  nuitDisponible = true,
}: {
  fond?: Fond
  lumiere?: Lumiere
  calques?: Calques
  detail?: boolean
  // faux si les tuiles de lumières nocturnes ne répondent pas : la nuit se passe alors d'elles
  nuitDisponible?: boolean
} = {}): StyleSpecification {
  const r = reglagesLumiere(lumiere)
  const donnees = (nom: string) => (detail ? fichier(nom) : AUCUNE_DONNEE)
  const c = lireCouleurs()
  const p = palette(fond, c, calques)
  const satellite = fond === 'satellite'

  const rivieres = (rang: number, large: [number, number], opacite: number) => ({
    id: `rivieres-${rang}`,
    type: 'line' as const,
    source: 'rivieres',
    filter: ['==', ['get', 'rang'], rang] as never,
    minzoom: rang === 1 ? (satellite ? 8.5 : 7) : 0,
    layout: {
      'line-cap': 'round' as const,
      'line-join': 'round' as const,
      ...visible(calques.eau),
    },
    paint: {
      'line-color': p.eauLigne,
      'line-opacity': opacite,
      'line-width': selonZoom(5, large[0], 9, large[1], 13, large[1] * 2.2),
      // Sur la photo, un bord légèrement flou : le trait se fond dans le lit de la rivière.
      'line-blur': satellite ? selonZoom(5, 0.4, 12, 1.2) : 0,
    },
  })

  return {
    version: 8,
    // Les changements d'heure se font en fondu.
    transition: { duration: 1800, delay: 0 },
    ...(satellite ? { sky: ciel(r) } : {}),
    sources: {
      relief: {
        type: 'raster-dem',
        tiles: [URL_TERRARIUM],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 12,
        attribution: 'Altitudes : Terrarium (AWS Open Data)',
      },
      ...(satellite
        ? {
            satellite: {
              type: 'raster' as const,
              tiles: [URL_SATELLITE],
              tileSize: 256,
              maxzoom: 15,
              attribution: `<a href="https://cloudless.eox.at" target="_blank" rel="noopener">${CREDIT_SATELLITE}</a>`,
            },
            nuit: {
              type: 'raster' as const,
              tiles: [URL_NUIT],
              tileSize: 256,
              maxzoom: 8,
              attribution: CREDIT_NUIT,
            },
            monde: { type: 'geojson' as const, data: monde },
          }
        : {
            vegetation: {
              type: 'geojson' as const,
              data: donnees('vegetation'),
              attribution: 'Végétation : ESA WorldCover 2021 (CC BY 4.0)',
            },
          }),
      pays: { type: 'geojson', data: geo(pays) },
      exterieur: { type: 'geojson', data: exterieur },
      regions: {
        type: 'geojson',
        data: geo(regionsGeo),
        attribution: 'Limites : Banque mondiale via geoBoundaries (CC BY 4.0)',
      },
      voisins: { type: 'geojson', data: donnees('voisins') },
      courbes: { type: 'geojson', data: donnees('courbes') },
      rivieres: {
        type: 'geojson',
        data: donnees('rivieres'),
        attribution: 'Eau et sommets : © OpenStreetMap (ODbL), Natural Earth',
      },
      'plans-eau': { type: 'geojson', data: donnees('plans-eau') },
    },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': p.fond } },
      ...(satellite
        ? fondSatellite(c, calques, r, nuitDisponible)
        : fondCarte(c, calques)),
      {
        id: 'courbes-fines',
        type: 'line',
        source: 'courbes',
        filter: ['!', ['get', 'maitresse']],
        minzoom: satellite ? 8 : 6.3,
        layout: visible(calques.courbes),
        paint: {
          'line-color': p.courbe,
          'line-opacity': p.courbeOpacite[0],
          'line-width': selonZoom(6, 0.4, 10, 1),
        },
      },
      {
        id: 'courbes-maitresses',
        type: 'line',
        source: 'courbes',
        filter: ['get', 'maitresse'],
        minzoom: satellite ? 6.5 : 5.4,
        layout: visible(calques.courbes),
        paint: {
          'line-color': p.courbe,
          'line-opacity': p.courbeOpacite[1],
          'line-width': selonZoom(5, 0.6, 10, 1.6),
        },
      },
      {
        id: 'plans-eau',
        type: 'fill',
        source: 'plans-eau',
        layout: visible(calques.eau),
        paint: { 'fill-color': p.eauSurface, 'fill-opacity': p.eauSurfaceOpacite },
      },
      ...(satellite
        ? []
        : [
            {
              id: 'plans-eau-bord',
              type: 'line' as const,
              source: 'plans-eau',
              layout: visible(calques.eau),
              paint: { 'line-color': c.riviere, 'line-width': 1, 'line-opacity': 0.8 },
            },
          ]),
      rivieres(1, [0.5, 1.2], satellite ? 0.4 : 0.65),
      rivieres(2, [0.9, 2], satellite ? 0.55 : 0.85),
      rivieres(3, [1.5, 4], satellite ? 0.8 : 1),
      {
        id: 'exterieur',
        type: 'fill',
        source: 'exterieur',
        paint: { 'fill-color': p.voile, 'fill-opacity': p.voileOpacite },
      },
      {
        id: 'pays-halo',
        type: 'line',
        source: 'pays',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': p.halo,
          'line-width': selonZoom(4, 8, 9, 20),
          'line-blur': selonZoom(4, 6, 9, 14),
          'line-opacity': p.haloOpacite,
        },
      },
      {
        id: 'voisins-lignes',
        type: 'line',
        source: 'voisins',
        layout: visible(calques.voisins),
        paint: {
          'line-color': p.trait,
          'line-opacity': satellite ? 0.4 : 0.45,
          'line-width': selonZoom(4, 0.7, 9, 1.4),
        },
      },
      {
        id: 'region-zones',
        type: 'fill',
        source: 'regions',
        paint: { 'fill-color': c.surface, 'fill-opacity': 0 },
      },
      {
        id: 'region-survol',
        type: 'fill',
        source: 'regions',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'fill-color': satellite ? c.clair : c.surface,
          'fill-opacity': satellite ? 0.12 : 0.32,
        },
      },
      {
        id: 'region-lignes',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': p.trait,
          'line-opacity': p.traitOpacite,
          'line-width': selonZoom(5, 0.7, 9, 1.6),
          'line-dasharray': [3, 2],
        },
      },
      // Sur la photo, un liseré sombre sous la frontière la détache de n'importe quel sol.
      ...(satellite
        ? [
            {
              id: 'pays-lisere',
              type: 'line' as const,
              source: 'pays',
              paint: {
                'line-color': c.encre,
                'line-opacity': 0.55,
                'line-width': 4,
                'line-blur': 1.5,
              },
            },
          ]
        : []),
      {
        id: 'pays-contour',
        type: 'line',
        source: 'pays',
        paint: { 'line-color': satellite ? c.clair : c.texte, 'line-width': 2 },
      },
    ],
  }
}
