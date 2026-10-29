import { useState } from 'react'
import LegendeAltitude from '@/components/ui/LegendeAltitude'
import { contes, couleurLangue, langues, regions } from '@/lib/contenu'
import { LIBELLES_TYPE, filtresActifs } from '@/lib/filtres'
import type { TypeConte } from '@/lib/schemas'
import { useAppStore } from '@/store/useAppStore'

const TYPES = Object.keys(LIBELLES_TYPE) as TypeConte[]

const puce = (actif: boolean) =>
  `flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
    actif
      ? 'border-texte bg-texte text-page'
      : 'border-ligne-forte bg-surface/70 hover:bg-surface'
  }`

const champ =
  'w-full rounded-full border border-ligne-forte bg-surface px-4 py-2.5 text-base placeholder:text-discret focus:border-texte'

export default function FiltresPanel({ visibles }: { visibles: number }) {
  const { filtres, setFiltres, reinitialiserFiltres } = useAppStore()
  const [ouvert, setOuvert] = useState(false)
  const actifs = filtresActifs(filtres)
  const languesPresentes = langues.filter((l) => contes.some((c) => c.langue === l.code))
  const regionsPresentes = regions.filter((r) => contes.some((c) => c.region === r.id))

  return (
    <div className="absolute left-3 top-[4.75rem] z-10 w-[min(21rem,calc(100%-6.5rem))] lg:w-80">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="panneau-filtres"
        onClick={() => setOuvert((o) => !o)}
        className="flottant flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-base font-bold ring-1 ring-ligne-forte lg:hidden"
      >
        Filtres
        {actifs > 0 && (
          <span className="chiffres grid size-6 place-items-center rounded-full bg-primaire text-sm text-sur-primaire">
            {actifs}
          </span>
        )}
      </button>

      <div
        id="panneau-filtres"
        className={`${ouvert ? 'block' : 'hidden'} verre mt-2 max-h-[calc(100svh-9rem)] overflow-y-auto rounded-3xl p-5 lg:mt-0 lg:block lg:max-h-[calc(100svh-6.5rem)]`}
      >
        <h2 className="font-display text-2xl font-extrabold leading-none tracking-tight">
          Contes sur la carte
        </h2>
        <p
          aria-live="polite"
          className="chiffres mt-1.5 text-sm font-semibold text-discret"
        >
          {visibles} sur {contes.length} affichés
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold">Titre</span>
          <input
            type="search"
            value={filtres.recherche}
            onChange={(e) => setFiltres({ recherche: e.target.value })}
            placeholder="Rechercher un conte"
            className={champ}
          />
        </label>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-bold">Langue</legend>
          <ul className="flex flex-wrap gap-1.5">
            {languesPresentes.map((l) => {
              const actif = filtres.langue === l.code
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFiltres({ langue: actif ? null : l.code })}
                    className={puce(actif)}
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full ring-2 ring-surface"
                      style={{ background: couleurLangue(l.code) }}
                    />
                    {l.nom}
                  </button>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-bold">Type</legend>
          <ul className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const actif = filtres.type === t
              return (
                <li key={t}>
                  <button
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFiltres({ type: actif ? null : t })}
                    className={puce(actif)}
                  >
                    {LIBELLES_TYPE[t]}
                  </button>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold">Région</span>
          <select
            value={filtres.region ?? ''}
            onChange={(e) => setFiltres({ region: e.target.value || null })}
            className={champ}
          >
            <option value="">Toutes les régions</option>
            {regionsPresentes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        </label>

        <LegendeAltitude className="mt-5" />

        {actifs > 0 && (
          <button
            type="button"
            onClick={reinitialiserFiltres}
            className="text-base font-bold text-lien underline decoration-2 underline-offset-4 hover:decoration-4"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>
    </div>
  )
}
