import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { couleurLangue, langueParCode, numeroDuConte, regionParId } from '@/lib/contenu'
import { LIBELLES_TYPE } from '@/lib/filtres'
import type { Conte } from '@/lib/schemas'

type Props = { conte: Conte; onFermer: () => void }

// Fiche d'aperçu en verre : volet bas sur téléphone, carte flottante sur grand écran.
export default function ApercuConte({ conte, onFermer }: Props) {
  const titre = useRef<HTMLHeadingElement>(null)
  const langue = langueParCode(conte.langue)

  useEffect(() => {
    titre.current?.focus({ preventScroll: true })
  }, [conte.id])

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onFermer])

  return (
    <aside
      aria-label="Aperçu du conte"
      className="verre-dense absolute inset-x-0 bottom-0 z-20 max-h-[62%] overflow-y-auto rounded-t-3xl lg:inset-y-3 lg:left-auto lg:right-3 lg:max-h-none lg:w-[24rem] lg:rounded-3xl"
    >
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer l'aperçu"
        className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-texte text-page"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <img
        src={conte.scenes[0].illustration}
        alt=""
        loading="lazy"
        className="m-3 hidden aspect-[16/9] w-[calc(100%-1.5rem)] rounded-2xl object-cover sm:block"
      />

      <div className="p-5 sm:pt-2">
        <h2
          ref={titre}
          tabIndex={-1}
          className="pr-12 font-display text-3xl font-extrabold leading-[1] tracking-[-0.03em] outline-none sm:pr-0"
        >
          <span className="chiffres mr-2 inline-grid size-8 place-items-center rounded-full bg-texte align-middle text-lg text-page">
            {numeroDuConte(conte.id)}
          </span>
          {conte.titre.fr}
        </h2>

        <dl className="chiffres mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base font-medium">
          <div>
            <dt className="sr-only">Région</dt>
            <dd>{regionParId(conte.region)?.nom}</dd>
          </div>
          <div>
            <dt className="sr-only">Langue</dt>
            <dd className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ background: couleurLangue(conte.langue) }}
              />
              {langue?.nom}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Durée</dt>
            <dd>{conte.dureeMinutes} min</dd>
          </div>
          <div>
            <dt className="sr-only">Type</dt>
            <dd>{LIBELLES_TYPE[conte.type]}</dd>
          </div>
        </dl>

        {!conte.conteur.consentement && (
          <p className="mt-3 inline-block rounded-full border border-ligne-forte px-3 py-0.5 text-sm font-bold">
            Contenu provisoire
          </p>
        )}

        <p className="mt-4 font-serif text-lg leading-relaxed">{conte.resume}</p>

        <Link
          to={`/conte/${conte.id}`}
          state={{ lecture: true }}
          className="flottant mt-5 inline-flex h-12 items-center rounded-full bg-texte px-7 text-lg font-bold text-page transition-transform duration-200 hover:-translate-y-0.5"
        >
          Écouter le conte
        </Link>
      </div>
    </aside>
  )
}
