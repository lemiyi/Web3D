import type { EtatNarration } from '@/lib/useNarration'

type Props = {
  etat: EtatNarration
  enLecture: boolean // la personne a demandé l'écoute (même entre deux scènes)
  fini: boolean
  vitesse: number
  muet: boolean
  peutRevenir: boolean
  peutAvancer: boolean
  onLire: () => void
  onPause: () => void
  onPrecedente: () => void
  onSuivante: () => void
  onVitesse: (v: number) => void
  onMuet: () => void
}

const VITESSES = [0.8, 1, 1.2]

const rond =
  'grid size-11 place-items-center rounded-full bg-surface text-texte ring-1 ring-ligne-forte transition-colors duration-150 hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-surface'

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export default function Commandes(p: Props) {
  const enCours = p.etat === 'lecture'
  const libelle = enCours
    ? 'Pause'
    : p.fini
      ? 'Réécouter'
      : p.etat === 'pause'
        ? 'Reprendre'
        : 'Écouter'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={enCours ? p.onPause : p.onLire}
        className="flottant flex h-12 items-center gap-2.5 rounded-full bg-texte px-6 text-lg font-bold text-page transition-transform duration-200 hover:-translate-y-0.5"
      >
        <Icone>
          {enCours ? (
            <>
              <path d="M8 5v14M16 5v14" />
            </>
          ) : (
            <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" />
          )}
        </Icone>
        {libelle}
      </button>

      <button
        type="button"
        onClick={p.onPrecedente}
        disabled={!p.peutRevenir}
        aria-label="Scène précédente"
        className={rond}
      >
        <Icone>
          <path d="M15 5l-7 7 7 7" />
        </Icone>
      </button>
      <button
        type="button"
        onClick={p.onSuivante}
        disabled={!p.peutAvancer}
        aria-label="Scène suivante"
        className={rond}
      >
        <Icone>
          <path d="M9 5l7 7-7 7" />
        </Icone>
      </button>

      <div
        role="group"
        aria-label="Vitesse de la voix"
        className="ml-auto flex rounded-full bg-surface p-1 ring-1 ring-ligne-forte"
      >
        {VITESSES.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={p.vitesse === v}
            onClick={() => p.onVitesse(v)}
            className={`chiffres h-9 rounded-full px-3 text-sm font-bold transition-colors duration-150 ${
              p.vitesse === v ? 'bg-texte text-page' : 'hover:bg-surface-2'
            }`}
          >
            {String(v).replace('.', ',')}×
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={p.onMuet}
        aria-pressed={p.muet}
        aria-label={p.muet ? 'Réactiver la voix' : 'Couper la voix (lire en silence)'}
        className={rond}
      >
        <Icone>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          {p.muet ? (
            <path d="M17 9l5 6M22 9l-5 6" />
          ) : (
            <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />
          )}
        </Icone>
      </button>
    </div>
  )
}
