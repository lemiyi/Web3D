import { Link } from 'react-router-dom'

type Props = { to: string; children: string; surTeinte?: boolean }

// Le bouton principal reprend la barre d'échelle d'une carte : segments alternés au-dessus du libellé.
export default function BoutonEchelle({ to, children, surTeinte = false }: Props) {
  const encre = surTeinte ? 'border-nuit' : 'border-os'
  const segment = surTeinte ? 'bg-nuit' : 'bg-os'
  return (
    <Link to={to} className="group block w-fit">
      <span aria-hidden="true" className={`flex h-2.5 border ${encre}`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            className={`flex-1 transition-[flex-grow] duration-300 group-hover:first:flex-[2] ${
              i % 2 === 0 ? segment : ''
            }`}
          />
        ))}
      </span>
      <span
        className={`mt-1.5 flex items-center gap-3 px-6 py-3 font-display text-2xl font-bold uppercase tracking-wider transition-colors duration-200 ${
          surTeinte
            ? 'bg-nuit text-os group-hover:bg-indigo'
            : 'bg-r2 text-nuit group-hover:bg-os'
        }`}
      >
        {children}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
        >
          <path d="M3 12h17M14 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}
