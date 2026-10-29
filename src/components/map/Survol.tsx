import { type Lumiere, LUMIERES } from '@/lib/lumiere'
import type { Etape } from '@/lib/survol'

type Props = {
  etapes: Etape[]
  indice: number
  enPause: boolean
  altitude: number | null
  onPause: () => void
  onSuivant: () => void
  onArreter: () => void
  lumiere: Lumiere
}

const bouton =
  'h-11 rounded-full px-5 text-base font-bold transition-colors duration-150 ring-1 ring-ligne-forte hover:bg-surface-2'

// Le bandeau du survol : où l'on est, à quelle altitude, et les commandes.
export default function Survol({
  etapes,
  indice,
  enPause,
  altitude,
  onPause,
  onSuivant,
  onArreter,
  lumiere,
}: Props) {
  const etape = etapes[indice]
  if (!etape) return null
  return (
    <section
      aria-label="Survol guidé"
      className="verre-dense flottant absolute bottom-4 left-1/2 z-20 w-[min(34rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-3xl p-4 lg:bottom-8"
    >
      <div aria-live="polite" className="min-h-[4.25rem]">
        <p className="chiffres text-sm font-semibold text-discret">
          Étape {indice + 1} sur {etapes.length} ·{' '}
          {LUMIERES.find((l) => l.id === lumiere)?.nom.toLowerCase()}
        </p>
        <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
          {etape.nom}
        </h2>
        <p className="text-base leading-snug text-discret">{etape.detail}</p>
        {altitude !== null && altitude > 0 && (
          <p className="chiffres mt-1 text-sm font-semibold">
            Altitude du sol ≈ {new Intl.NumberFormat('fr-FR').format(altitude)} m
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onPause} className={`${bouton} bg-surface`}>
          {enPause ? 'Reprendre' : 'Pause'}
        </button>
        {!etape.derniere && (
          <button type="button" onClick={onSuivant} className={`${bouton} bg-surface`}>
            Lieu suivant
          </button>
        )}
        <button
          type="button"
          onClick={onArreter}
          className="ml-auto h-11 rounded-full bg-texte px-5 text-base font-bold text-page"
        >
          {etape.derniere ? 'Choisir un conte' : 'Arrêter'}
        </button>
      </div>
    </section>
  )
}
