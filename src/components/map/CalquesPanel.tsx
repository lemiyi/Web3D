import { useEffect, useRef, useState } from 'react'
import { type Calques, FONDS, type Fond, LIBELLES_CALQUES } from '@/lib/calques'
import { type Lumiere, LUMIERES } from '@/lib/lumiere'

const LEGENDE_VEGETATION = [
  { nom: 'Forêt', couleur: 'var(--savane-700)' },
  { nom: 'Savane arborée', couleur: 'var(--savane-500)' },
  { nom: 'Zone humide', couleur: 'var(--indigo-300)' },
  { nom: 'Sol nu', couleur: 'var(--ocre-300)' },
]

type Props = {
  fond: Fond
  onFond: (fond: Fond) => void
  lumiere: Lumiere
  onLumiere: (lumiere: Lumiere) => void
  calques: Calques
  onChange: (suivant: Calques) => void
}

export default function CalquesPanel({
  fond,
  onFond,
  lumiere,
  onLumiere,
  calques,
  onChange,
}: Props) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)

  // Échap referme le panneau et rend le focus au bouton.
  useEffect(() => {
    if (!ouvert) return
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOuvert(false)
      racine.current?.querySelector('button')?.focus()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [ouvert])

  return (
    <div ref={racine} className="relative">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="panneau-calques"
        onClick={() => setOuvert((o) => !o)}
        className="flottant h-10 rounded-full bg-surface px-5 text-base font-bold ring-1 ring-ligne-forte transition-colors duration-150 hover:bg-surface-2"
      >
        Calques
      </button>

      {ouvert && (
        <div
          id="panneau-calques"
          className="verre-dense absolute right-0 top-full z-20 mt-2 max-h-[calc(100svh-12rem)] w-[min(17rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl p-4"
        >
          <fieldset>
            <legend className="font-display text-lg font-extrabold leading-none tracking-tight">
              Fond de carte
            </legend>
            <div className="mt-2 grid gap-1">
              {FONDS.map(({ id, nom, aide }) => (
                <label key={id} className="flex cursor-pointer items-start gap-3 py-1.5">
                  <input
                    type="radio"
                    name="fond"
                    checked={fond === id}
                    onChange={() => onFond(id)}
                    className="mt-0.5 size-5 shrink-0 accent-primaire"
                  />
                  <span>
                    <span className="block text-base font-bold leading-tight">{nom}</span>
                    <span className="block text-sm leading-tight text-discret">
                      {aide}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {fond !== 'carte' && (
            <fieldset className="mt-4 border-t border-ligne pt-4">
              <legend className="float-left w-full font-display text-lg font-extrabold leading-none tracking-tight">
                Heure
              </legend>
              <div className="clear-both grid gap-1 pt-2">
                {LUMIERES.map(({ id, nom, aide }) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-start gap-3 py-1.5"
                  >
                    <input
                      type="radio"
                      name="lumiere"
                      checked={lumiere === id}
                      onChange={() => onLumiere(id)}
                      className="mt-0.5 size-5 shrink-0 accent-primaire"
                    />
                    <span>
                      <span className="block text-base font-bold leading-tight">
                        {nom}
                      </span>
                      <span className="block text-sm leading-tight text-discret">
                        {aide}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <h2 className="mt-4 border-t border-ligne pt-4 font-display text-lg font-extrabold leading-none tracking-tight">
            Ce que montre la carte
          </h2>
          <ul className="mt-2">
            {LIBELLES_CALQUES.filter((l) => l.fonds.includes(fond)).map(
              ({ id, nom, aide }) => (
                <li key={id}>
                  <label className="flex cursor-pointer items-start gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={calques[id]}
                      onChange={(e) => onChange({ ...calques, [id]: e.target.checked })}
                      className="mt-0.5 size-5 shrink-0 accent-primaire"
                    />
                    <span>
                      <span className="block text-base font-bold leading-tight">
                        {nom}
                      </span>
                      <span className="block text-sm leading-tight text-discret">
                        {aide}
                      </span>
                    </span>
                  </label>
                </li>
              ),
            )}
          </ul>
          {fond === 'carte' && calques.vegetation && (
            <ul
              aria-label="Légende de la végétation"
              className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-ligne pt-3 text-sm"
            >
              {LEGENDE_VEGETATION.map(({ nom, couleur }) => (
                <li key={nom} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3.5 shrink-0 rounded-sm ring-1 ring-ligne-forte"
                    style={{ background: couleur }}
                  />
                  {nom}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
