import { useMemo } from 'react'
import { motActif, motsDuTexte } from '@/lib/narration'

type Props = {
  texte: string
  position: number // -1 : lecture pas commencée, le texte reste lisible tel quel
}

// Texte du conte surligné mot à mot, au rythme de la voix. Le texte entier reste lisible en permanence.
export default function TexteSynchronise({ texte, position }: Props) {
  const mots = useMemo(() => motsDuTexte(texte), [texte])
  const courant = motActif(mots, position)
  const commence = position >= 0

  return (
    <p className="font-serif text-xl leading-relaxed text-balance sm:text-2xl">
      {mots.map((m, i) => {
        const etat = !commence
          ? 'neutre'
          : i < courant
            ? 'dit'
            : i === courant
              ? 'courant'
              : 'a-venir'
        return (
          <span key={m.debut}>
            <span
              data-etat={etat}
              className={`rounded-md px-0.5 transition-colors duration-150 ${
                etat === 'courant'
                  ? 'bg-accent text-sur-accent'
                  : etat === 'a-venir'
                    ? 'opacity-65'
                    : ''
              }`}
            >
              {m.texte}
            </span>{' '}
          </span>
        )
      })}
    </p>
  )
}
