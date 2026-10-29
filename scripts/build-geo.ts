// Génère les données cartographiques statiques (`npm run build:geo`, à relancer seulement si les sources changent).
//   - limites du pays et des 13 régions : geoBoundaries / World Bank (CC BY 4.0)
//   - altitudes : tuiles Terrarium (AWS Open Data, issues de SRTM et d'autres modèles)
//   - rivières du hero (accueil) : Natural Earth (domaine public)
//   - courbes de niveau du Burkina : calculées sur les altitudes (public/geo/courbes.geo.json)
// Les rivières, plans d'eau, sommets et pays voisins de la carte interactive viennent de `build-carte.ts`.
import { join } from 'node:path'
import { contours } from 'd3-contour'
import { PNG } from 'pngjs'
import { BBOX, ECHELLE, K, VIEWBOX, versViewBox } from '../src/lib/projection.ts'
import { SEUILS as SEUILS_RELIEF } from '../src/lib/relief.ts'
import {
  anneaux,
  arrondi,
  arrondiLonLat,
  decouper,
  ecrire,
  featureCollection,
  pointDansPolygones,
  racine,
  simplifier,
  simplifierAnneau,
  slug,
  telecharger,
  type Feature,
  type Pt,
  type Ring,
} from './geo-utils.ts'

const sortie = join(racine, 'src/content/geo')
const publicGeo = join(racine, 'public/geo')

const projeter = (p: Pt): Pt => {
  const { x, y } = versViewBox(p)
  return [x, y]
}

const cheminAnneau = (anneau: Ring, tolerance: number) => {
  const pts = simplifierAnneau(anneau, tolerance)
  if (pts.length < 4) return ''
  return `M${pts.map(([x, y]) => `${arrondi(x)} ${arrondi(y)}`).join('L')}Z`
}

// ---------- limites ----------
const base =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BFA'
const adm0 = JSON.parse(
  (
    await telecharger(
      `${base}/ADM0/geoBoundaries-BFA-ADM0_simplified.geojson`,
      'adm0.geojson',
    )
  ).toString(),
) as { features: Feature[] }
const adm1 = JSON.parse(
  (
    await telecharger(
      `${base}/ADM1/geoBoundaries-BFA-ADM1_simplified.geojson`,
      'adm1.geojson',
    )
  ).toString(),
) as { features: Feature[] }

const simplifierLonLat = (r: Ring) => arrondiLonLat(simplifierAnneau(r, 0.004))

const paysGeo = adm0.features.map((f) => ({
  type: 'Feature',
  properties: { id: 'burkina-faso' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: anneaux(f).map((p) => p.map(simplifierLonLat)),
  },
}))
ecrire(join(sortie, 'pays.geo.json'), featureCollection(paysGeo))

const regionsGeo = adm1.features.map((f) => ({
  type: 'Feature',
  properties: { id: slug(String(f.properties.shapeName)), nom: f.properties.shapeName },
  geometry: {
    type: 'MultiPolygon',
    coordinates: anneaux(f).map((p) => p.map(simplifierLonLat)),
  },
}))
ecrire(join(sortie, 'regions.geo.json'), featureCollection(regionsGeo))

// ---------- rivières ----------
const NOMS_RIVIERES = new Set(['Mouhoun', 'Nakanbé', 'Komoé', 'Niger', 'Oti', 'Ouémé'])
const rivieres = JSON.parse(
  (
    await telecharger(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson',
      'rivieres.geo.json',
    )
  ).toString(),
) as { features: Feature[] }

const dansEmprise = ([x, y]: Pt) => x > BBOX.w && x < BBOX.e && y > BBOX.s && y < BBOX.n
const lignesRivieres: { nom: string; lignes: Pt[][] }[] = []
for (const f of rivieres.features) {
  const nom = String(f.properties.name)
  if (!NOMS_RIVIERES.has(nom)) continue
  const lignes = (f.geometry.coordinates as Pt[][])
    .map((l) => l.filter(dansEmprise))
    .filter((l) => l.length > 1)
  if (lignes.length) lignesRivieres.push({ nom, lignes })
}

// ---------- relief ----------
const Z = 7
const N = 2 ** Z
const tuileX = (lon: number) => Math.floor(((lon + 180) / 360) * N)
const tuileY = (lat: number) => {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N)
}
const x0 = tuileX(BBOX.w)
const x1 = tuileX(BBOX.e)
const y0 = tuileY(BBOX.n)
const y1 = tuileY(BBOX.s)
const T = 256
const largeur = (x1 - x0 + 1) * T
const hauteur = (y1 - y0 + 1) * T
const altitudes = new Float32Array(largeur * hauteur)

for (let ty = y0; ty <= y1; ty++) {
  for (let tx = x0; tx <= x1; tx++) {
    const png = PNG.sync.read(
      await telecharger(
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`,
        `terrarium-${Z}-${tx}-${ty}.png`,
      ),
    )
    for (let py = 0; py < T; py++) {
      for (let px = 0; px < T; px++) {
        const i = (py * T + px) * 4
        const alt = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768
        altitudes[((ty - y0) * T + py) * largeur + (tx - x0) * T + px] = alt
      }
    }
  }
}

// Réduction par 2 pour alléger les courbes.
const R = 2
const gl = Math.floor(largeur / R)
const gh = Math.floor(hauteur / R)
const grille = new Float64Array(gl * gh)
for (let y = 0; y < gh; y++) {
  for (let x = 0; x < gl; x++) {
    let somme = 0
    for (let dy = 0; dy < R; dy++)
      for (let dx = 0; dx < R; dx++)
        somme += altitudes[(y * R + dy) * largeur + x * R + dx]
    grille[y * gl + x] = somme / (R * R)
  }
}

// pixel de la grille -> [lon, lat] (projection Web Mercator inverse)
const pixelVersLonLat = (gx: number, gy: number): Pt => {
  const mx = (x0 * T + gx * R) / (N * T)
  const my = (y0 * T + gy * R) / (N * T)
  const lon = mx * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180) / Math.PI
  return [lon, lat]
}

const SEUILS = [...SEUILS_RELIEF]
const generateur = contours().size([gl, gh]).thresholds(SEUILS)
const bandes = generateur(Array.from(grille)).map((c) => ({
  min: c.value,
  d: c.coordinates
    .map((polygone) =>
      polygone
        .map((anneau) =>
          cheminAnneau(
            (anneau as Ring).map(([gx, gy]) => projeter(pixelVersLonLat(gx, gy))),
            0.9,
          ),
        )
        .join(''),
    )
    .join(''),
}))

const cheminsPays = paysGeo.flatMap((f) =>
  (f.geometry.coordinates as Ring[][]).map((p) =>
    p.map((a) => cheminAnneau(a.map(projeter), 0.15)).join(''),
  ),
)
const cheminsRegions = regionsGeo.map((f) => {
  const pts = (f.geometry.coordinates as Ring[][]).flatMap((p) =>
    p.flatMap((a) => a.map(projeter)),
  )
  const xs = pts.map(([x]) => x)
  const ys = pts.map(([, y]) => y)
  return {
    id: f.properties.id as string,
    nom: f.properties.nom as string,
    // [x, y, largeur, hauteur] dans le repère du viewBox
    bbox: [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ].map((v) => arrondi(v)),
    d: (f.geometry.coordinates as Ring[][])
      .map((p) => p.map((a) => cheminAnneau(a.map(projeter), 0.15)).join(''))
      .join(''),
  }
})
const cheminsRivieres = lignesRivieres.map(({ nom, lignes }) => ({
  nom,
  d: lignes
    .map((l) => {
      const pts = simplifier(l.map(projeter), 0.3)
      return pts.length > 1
        ? `M${pts.map(([x, y]) => `${arrondi(x)} ${arrondi(y)}`).join('L')}`
        : ''
    })
    .join(''),
}))

ecrire(
  join(sortie, 'hero-map.json'),
  JSON.stringify({
    viewBox: VIEWBOX,
    projection: { ouest: BBOX.w, nord: BBOX.n, k: K, echelle: ECHELLE },
    pays: cheminsPays.join(''),
    regions: cheminsRegions,
    rivieres: cheminsRivieres,
    seuils: SEUILS,
    bandes,
  }),
)

// ---------- courbes de niveau (Burkina seulement) ----------
// Une courbe tous les 25 m, une courbe maîtresse (plus marquée) tous les 100 m.
const PAS_COURBE = 25
const niveaux: number[] = []
for (let a = 100; a <= 800; a += PAS_COURBE) niveaux.push(a)
const polygonesPays = paysGeo.flatMap((f) => f.geometry.coordinates as Ring[][])
const dansPays = (p: Pt) => pointDansPolygones(p, polygonesPays)
const courbes = contours()
  .size([gl, gh])
  .thresholds(niveaux)(Array.from(grille))
  .map((c) => ({
    type: 'Feature',
    properties: { alt: c.value, maitresse: c.value % 100 === 0 },
    geometry: {
      type: 'MultiLineString',
      coordinates: c.coordinates.flatMap((polygone) =>
        polygone.flatMap((anneau) =>
          decouper(
            (anneau as Ring).map(([gx, gy]) => pixelVersLonLat(gx, gy)),
            dansPays,
          )
            .map((l) => arrondiLonLat(simplifier(l, 0.006), 3))
            .filter((l) => l.length > 3),
        ),
      ),
    },
  }))
  .filter((f) => f.geometry.coordinates.length > 0)
ecrire(join(publicGeo, 'courbes.geo.json'), featureCollection(courbes))

console.log(`✓ géodonnées générées dans src/content/geo (viewBox ${VIEWBOX.join(' ')})`)
