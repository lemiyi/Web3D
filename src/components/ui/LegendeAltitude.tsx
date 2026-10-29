import { NB_BANDES, SEUILS } from '@/lib/relief'

// La clé d'une carte de relief : chaque couleur est une tranche d'altitude, les seuils sont en mètres.
export default function LegendeAltitude({ className = '' }: { className?: string }) {
  return (
    <figure className={className}>
      <figcaption className="text-sm font-bold">Altitude (m)</figcaption>
      <ol className="mt-1.5 flex pb-6">
        {Array.from({ length: NB_BANDES }, (_, i) => (
          <li
            key={i}
            className="relative h-3 flex-1 first:rounded-l-full last:rounded-r-full"
            style={{ background: `var(--relief-${i})` }}
          >
            {i < SEUILS.length && (
              <span className="chiffres absolute right-0 top-full translate-x-1/2 pt-1 text-xs font-semibold leading-none text-discret">
                {SEUILS[i]}
              </span>
            )}
            <span className="sr-only">
              {i === 0
                ? `moins de ${SEUILS[0]} mètres`
                : i === SEUILS.length
                  ? `plus de ${SEUILS[i - 1]} mètres`
                  : `de ${SEUILS[i - 1]} à ${SEUILS[i]} mètres`}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
