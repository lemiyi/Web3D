import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Scene } from '@/lib/schemas'

type Props = { choix: NonNullable<Scene['choix']>; onChoisir: (vers: string) => void }

// L'histoire se coupe en deux : une option de chaque côté d'un axe central.
export default function Choix({ choix, onChoisir }: Props) {
  const premier = useRef<HTMLButtonElement>(null)
  useEffect(() => premier.current?.focus({ preventScroll: true }), [])

  return (
    <div
      role="group"
      aria-label="Choisissez la suite du conte"
      className="absolute inset-x-3 top-[36%] z-20 mx-auto max-w-4xl -translate-y-1/2"
    >
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center font-display text-2xl font-extrabold tracking-tight text-terre-50 [text-shadow:0_2px_12px_var(--terre-900)]"
      >
        Choisissez la suite
      </motion.p>
      <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {choix.map((c, i) => (
          <div key={c.vers} className="contents">
            {i === 1 && (
              <span
                aria-hidden="true"
                className="grid place-items-center font-display text-lg font-extrabold text-terre-50 [text-shadow:0_2px_12px_var(--terre-900)]"
              >
                ou
              </span>
            )}
            <motion.button
              ref={i === 0 ? premier : undefined}
              type="button"
              onClick={() => onChoisir(c.vers)}
              initial={{ opacity: 0, x: i === 0 ? -60 : 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="flottant rounded-3xl bg-surface px-6 py-7 text-left font-display text-2xl font-extrabold leading-tight tracking-tight ring-1 ring-ligne-forte"
            >
              {c.label}
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  )
}
