import { couleurLangue, langueParCode, numeroDuConte, regionParId } from '@/lib/contenu'
import type { Conte } from '@/lib/schemas'

type Props = { conte: Conte; actif: boolean; onClick: () => void }

// Repère numéroté de la carte : la couleur donne la langue, le numéro suit l'ordre nord-sud.
export default function Repere({ conte, actif, onClick }: Props) {
  const langue = langueParCode(conte.langue)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      aria-label={`${numeroDuConte(conte.id)}. ${conte.titre.fr}, ${langue?.nom}, ${regionParId(conte.region)?.nom}`}
      className="group grid size-11 place-items-center"
    >
      <span
        className={`chiffres flottant grid place-items-center rounded-full border-[3px] border-surface font-display font-extrabold text-sur-lang transition-all duration-300 ease-[var(--ease-sortie)] group-hover:scale-110 ${
          actif ? 'size-11 text-xl ring-[3px] ring-texte' : 'size-8 text-base'
        }`}
        style={{ background: couleurLangue(conte.langue) }}
      >
        {numeroDuConte(conte.id)}
      </span>
    </button>
  )
}
