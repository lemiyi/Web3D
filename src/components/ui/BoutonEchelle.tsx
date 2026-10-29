import { Link } from 'react-router-dom'

// Le bouton d'action reprend la barre d'échelle d'une carte : segments alternés au-dessus d'une grosse pilule.
export default function BoutonEchelle({
  to,
  children,
}: {
  to: string
  children: string
}) {
  return (
    <Link to={to} className="group flex w-fit flex-col gap-1.5">
      <span
        aria-hidden="true"
        className="flex h-2 overflow-hidden rounded-full border border-texte/70"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            className={`flex-1 transition-[flex-grow] duration-300 group-hover:first:flex-[2] ${
              i % 2 === 0 ? 'bg-texte' : ''
            }`}
          />
        ))}
      </span>
      <span className="flottant flex items-center gap-3 rounded-full bg-texte px-8 py-4 text-lg font-bold text-page transition-transform duration-200 group-hover:-translate-y-0.5">
        {children}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  )
}
