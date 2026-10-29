import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
  type ErrorEvent,
  type MapMouseEvent,
  type MapRef,
  type MapSourceDataEvent,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@/lib/maplibreWorker'
import EtiquettesNature from '@/components/map/EtiquettesNature'
import EtiquettesRegions from '@/components/map/EtiquettesRegions'
import Repere from '@/components/map/Repere'
import type { Calques } from '@/lib/calques'
import { EauVivante } from '@/lib/eauVivante'
import type { Lumiere } from '@/lib/lumiere'
import { creerStyleCarte } from '@/lib/mapStyle'
import { type Marges, type Pilote, piloteMapLibre } from '@/lib/pilote'
import { BBOX } from '@/lib/projection'
import type { Conte } from '@/lib/schemas'
import { useTheme } from '@/lib/theme'

type Props = {
  fond: 'satellite' | 'carte'
  lumiere: Lumiere
  calques: Calques
  vue3d: boolean
  contes: Conte[]
  ouvert: Conte | undefined
  selection: string | null
  onSelection: (id: string) => void
  reduit: boolean
  nuitDisponible: boolean
  pilote: RefObject<Pilote | null>
  marges: () => Marges
  onPret: () => void
  onViser: (lon: number, lat: number) => void
  onErreur: (e: ErrorEvent) => void
  onDonnees: (e: MapSourceDataEvent) => void
}

const estLarge = () => window.matchMedia('(min-width: 1024px)').matches

// Le Burkina au centre, avec assez de marge pour qu'on voie aussi les pays voisins autour.
// Sur téléphone la largeur limite le zoom : on élargit surtout vers le nord et le sud, où il y a de la place.
const limites = (): [[number, number], [number, number]] => {
  const cote = estLarge() ? 1.1 : 0.3
  return [
    [BBOX.w - cote, BBOX.s - 0.9],
    [BBOX.e + cote, BBOX.n + 1],
  ]
}
// Très large : sur un téléphone en hauteur, des limites serrées forceraient un zoom trop fort.
const EMPRISE: [number, number, number, number] = [-13, 1, 9, 24]

// Exagération du relief en 3D : discrète sur la photo pour rester crédible, plus marquée sur la carte illustrée.
const EXAGERATION = { satellite: 2.5, carte: 5 }

const niveauDeZoom = (zoom: number): 0 | 1 | 2 => (zoom < 5.4 ? 0 : zoom < 6.2 ? 1 : 2)

// La carte MapLibre (fonds « Satellite » et « Carte en relief »), chargée seulement quand on la choisit.
export default function VueCarte({
  fond,
  lumiere,
  calques,
  vue3d,
  contes,
  ouvert,
  selection,
  onSelection,
  reduit,
  nuitDisponible,
  pilote,
  marges,
  onPret,
  onViser,
  onErreur,
  onDonnees,
}: Props) {
  const carte = useRef<MapRef>(null)
  const theme = useTheme()
  const [pret, setPret] = useState(false)
  // Les détails se chargent après le premier affichage du relief.
  const [detail, setDetail] = useState(false)
  const [survol, setSurvol] = useState(false)
  const [niveau, setNiveau] = useState<0 | 1 | 2>(2)
  const [zoom, setZoom] = useState(6)
  const eau = useMemo(() => new EauVivante(), [])

  // Le style lit les variables CSS du thème : on le reconstruit quand le thème change.
  const style = useMemo(
    () => creerStyleCarte({ fond, lumiere, calques, detail, nuitDisponible }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, fond, lumiere, calques, detail, nuitDisponible],
  )

  // L'eau des lacs (WebGL) vit hors du style : on la remet après chaque changement de style, sur la photo seulement.
  useEffect(() => {
    const map = carte.current?.getMap()
    if (!pret || !map) return
    const placer = () => {
      const present = Boolean(map.getLayer(eau.id))
      // Tout en haut de la pile : insérée entre deux couches drapées sur le relief, elle couperait leur rendu
      // en deux et le voile des pays voisins serait mal appliqué. Le voile des lacs voisins est fait par l'eau elle-même.
      if (fond === 'satellite' && !present && map.getLayer('exterieur')) map.addLayer(eau)
      if (fond !== 'satellite' && present) map.removeLayer(eau.id)
    }
    placer()
    map.on('styledata', placer)
    return () => {
      map.off('styledata', placer)
    }
  }, [pret, fond, eau])

  useEffect(() => {
    eau.definirAnimation(!reduit)
    eau.definirLumiere(lumiere)
    eau.definirActif(calques.eau)
    eau.definirVoile(calques.voisins ? 0.48 : 0.92)
  }, [eau, reduit, lumiere, calques.eau, calques.voisins, theme])

  // Revenir en 2D doit aussi retirer le relief 3D : sans cela il resterait actif sous une vue à plat.
  useEffect(() => {
    if (pret && !vue3d) carte.current?.getMap().setTerrain(null)
  }, [pret, vue3d])

  // Pendant un changement de style, la couche de survol n'existe pas encore : on ne touche qu'à ce qui existe.
  const marquerRegion = useCallback((id: string) => {
    const map = carte.current?.getMap()
    if (map?.getLayer('region-survol'))
      map.setFilter('region-survol', ['==', ['get', 'id'], id])
  }, [])

  const surSurvol = useCallback(
    (e: MapMouseEvent) => {
      onViser(e.lngLat.lng, e.lngLat.lat)
      const id = (e.features?.[0]?.properties?.id as string | undefined) ?? ''
      setSurvol(Boolean(id))
      marquerRegion(id)
    },
    [marquerRegion, onViser],
  )

  return (
    <Map
      ref={carte}
      mapStyle={style}
      initialViewState={{
        bounds: limites(),
        fitBoundsOptions: { padding: marges() },
      }}
      maxBounds={EMPRISE}
      minZoom={4.5}
      maxPitch={70}
      attributionControl={false}
      terrain={vue3d ? { source: 'relief', exaggeration: EXAGERATION[fond] } : undefined}
      interactiveLayerIds={['region-zones']}
      cursor={survol ? 'pointer' : 'grab'}
      onMouseMove={surSurvol}
      onMouseLeave={() => {
        setSurvol(false)
        marquerRegion('')
      }}
      onClick={(e) => onViser(e.lngLat.lng, e.lngLat.lat)}
      onZoom={(e) => {
        setNiveau(niveauDeZoom(e.viewState.zoom))
        setZoom(Math.round(e.viewState.zoom * 4) / 4)
      }}
      onLoad={(e) => {
        // La mention des sources reste repliée pour ne pas couvrir la carte.
        const attribution = document.querySelector('.maplibregl-ctrl-attrib')
        attribution?.removeAttribute('open')
        attribution?.classList.remove('maplibregl-compact-show')
        // Réservé au développement (retiré du build) : permet aux mesures automatisées d'interroger la carte.
        if (import.meta.env.DEV) Object.assign(window, { __carte: e.target, __eau: eau })
        setNiveau(niveauDeZoom(e.target.getZoom()))
        setZoom(Math.round(e.target.getZoom() * 4) / 4)
        pilote.current = piloteMapLibre(e.target, limites)
        setPret(true)
        onPret()
        e.target.once('idle', () => window.setTimeout(() => setDetail(true), 600))
      }}
      onError={onErreur}
      onSourceData={onDonnees}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <AttributionControl position="bottom-left" />
      <EtiquettesNature zoom={zoom} calques={calques} />
      <EtiquettesRegions niveau={niveau} ouvert={ouvert} />
      {contes.map((c) => (
        <Marker key={c.id} longitude={c.coordonnees[0]} latitude={c.coordonnees[1]}>
          <Repere
            conte={c}
            actif={c.id === selection}
            onClick={() => onSelection(c.id)}
          />
        </Marker>
      ))}
    </Map>
  )
}
