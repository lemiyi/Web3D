import { Marker } from 'react-map-gl/maplibre'
import { regions } from '@/lib/contenu'
import type { Conte } from '@/lib/schemas'

type Props = {
  // 0 : trop dézoomé pour lire des noms, 1 : petits noms, 2 : noms complets
  niveau: 0 | 1 | 2
  ouvert: Conte | undefined
}

// Les noms de régions sont du texte HTML dans la police du site : la typographie va jusque sur la carte.
export default function EtiquettesRegions({ niveau, ouvert }: Props) {
  if (niveau === 0) return null
  return regions.map((r) => {
    // Sous le repère du conte ouvert, un nom voisin le recouvrirait : on le masque.
    if (ouvert) {
      const [dx, dy] = [
        r.centre[0] - ouvert.coordonnees[0],
        r.centre[1] - ouvert.coordonnees[1],
      ]
      if (Math.hypot(dx, dy) < 0.6) return null
    }
    return (
      <Marker
        key={r.id}
        longitude={r.centre[0]}
        latitude={r.centre[1]}
        anchor="top"
        offset={[0, 24]}
      >
        <span
          className={`pointer-events-none block max-w-28 text-center font-display font-bold leading-[0.95] tracking-tight text-[var(--etiquette)] ${
            niveau === 2 ? 'text-[0.95rem]' : 'text-[0.72rem]'
          }`}
          style={{ WebkitTextStroke: '4px var(--etiquette-halo)', paintOrder: 'stroke' }}
        >
          {r.nom}
        </span>
      </Marker>
    )
  })
}
