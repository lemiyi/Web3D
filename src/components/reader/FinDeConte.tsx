import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { contes, langueParCode } from '@/lib/contenu'
import type { Conte } from '@/lib/schemas'
import { useAppStore } from '@/store/useAppStore'

type Props = { conte: Conte; onRecommencer: () => void }

export default function FinDeConte({ conte, onRecommencer }: Props) {
  const selectionner = useAppStore((s) => s.selectionner)
  const titre = useRef<HTMLHeadingElement>(null)
  useEffect(() => titre.current?.focus({ preventScroll: true }), [])

  // Contes proches : même langue d'abord, puis même région.
  const proches = contes
    .filter(
      (c) =>
        c.id !== conte.id && (c.langue === conte.langue || c.region === conte.region),
    )
    .slice(0, 3)

  return (
    <motion.section
      aria-labelledby="fin-du-conte"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="verre-dense absolute inset-x-3 top-1/2 z-20 mx-auto max-h-[78%] max-w-xl -translate-y-1/2 overflow-y-auto rounded-3xl p-6"
    >
      <h2
        id="fin-du-conte"
        ref={titre}
        tabIndex={-1}
        className="font-display text-4xl font-extrabold leading-none tracking-[-0.035em] outline-none"
      >
        Fin du conte
      </h2>
      <p className="mt-3 font-serif text-lg leading-relaxed text-discret">
        {conte.resume}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRecommencer}
          className="flottant h-12 rounded-full bg-texte px-6 text-lg font-bold text-page"
        >
          Réécouter
        </button>
        <Link
          to="/carte"
          onClick={() => selectionner(conte.id)}
          className="flex h-12 items-center rounded-full bg-surface px-6 text-lg font-bold ring-1 ring-ligne-forte hover:bg-surface-2"
        >
          Retour à la carte
        </Link>
      </div>

      {proches.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-bold">À écouter ensuite</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {proches.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/conte/${c.id}`}
                  state={{ lecture: true }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ligne hover:bg-surface-2"
                >
                  <span className="font-display text-lg font-bold tracking-tight">
                    {c.titre.fr}
                  </span>
                  <span className="text-sm font-semibold text-discret">
                    {langueParCode(c.langue)?.nom}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.section>
  )
}
