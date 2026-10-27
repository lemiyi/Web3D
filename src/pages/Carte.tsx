import { useRef, useState } from 'react'
import Map, {
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Link } from 'react-router-dom'
import { contes, langueParCode, regionParId } from '@/lib/contenu'
import { useAppStore } from '@/store/useAppStore'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty' // plan B : MapTiler
const TERRARIUM =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const VUE_BURKINA = { longitude: -1.6, latitude: 12.3, zoom: 5.6 }

export default function Carte() {
  const mapRef = useRef<MapRef>(null)
  const [vue3d, setVue3d] = useState(false)
  const { conteSelectionne, selectionner } = useAppStore()
  const conte = contes.find((c) => c.id === conteSelectionne)

  const basculer3d = () => {
    const suivant = !vue3d
    setVue3d(suivant)
    mapRef.current?.easeTo({ pitch: suivant ? 60 : 0, duration: 800 })
  }

  return (
    <div className="relative h-full">
      <Map
        ref={mapRef}
        initialViewState={VUE_BURKINA}
        mapStyle={STYLE}
        terrain={vue3d ? { source: 'relief', exaggeration: 2 } : undefined}
        maxPitch={70}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <Source
          id="relief"
          type="raster-dem"
          tiles={[TERRARIUM]}
          encoding="terrarium"
          tileSize={256}
          maxzoom={15}
        />
        {contes.map((c) => (
          <Marker key={c.id} longitude={c.coordonnees[0]} latitude={c.coordonnees[1]}>
            <button
              type="button"
              aria-label={`${c.titre.fr} (${langueParCode(c.langue)?.nom})`}
              onClick={() => selectionner(c.id)}
              className="size-6 rounded-full border-2 border-white shadow"
              style={{ background: langueParCode(c.langue)?.couleur }}
            />
          </Marker>
        ))}
      </Map>

      <div className="absolute left-3 top-3 flex gap-2">
        <button
          type="button"
          onClick={basculer3d}
          aria-pressed={vue3d}
          className="rounded bg-white px-3 py-2 font-medium shadow"
        >
          {vue3d ? 'Vue 2D' : 'Vue 3D'}
        </button>
        <button
          type="button"
          onClick={() =>
            mapRef.current?.flyTo({
              ...VUE_BURKINA,
              center: [VUE_BURKINA.longitude, VUE_BURKINA.latitude],
              pitch: 0,
            })
          }
          className="rounded bg-white px-3 py-2 font-medium shadow"
        >
          Recentrer
        </button>
      </div>

      {conte && (
        <aside
          aria-label="Aperçu du conte"
          className="absolute inset-x-0 bottom-0 rounded-t-xl bg-white p-4 shadow-lg md:inset-y-0 md:left-auto md:right-0 md:w-80 md:rounded-none"
        >
          <button
            type="button"
            onClick={() => selectionner(null)}
            className="float-right px-2"
          >
            ✕<span className="sr-only">Fermer</span>
          </button>
          <h2 className="font-serif text-xl font-bold">{conte.titre.fr}</h2>
          <p className="text-sm">
            {regionParId(conte.region)?.nom} · {langueParCode(conte.langue)?.nom} ·{' '}
            {conte.dureeMinutes} min
          </p>
          <p className="my-3">{conte.resume}</p>
          <Link
            to={`/conte/${conte.id}`}
            className="inline-block rounded bg-laterite px-4 py-2 font-semibold text-white"
          >
            Lire le conte
          </Link>
        </aside>
      )}
    </div>
  )
}
