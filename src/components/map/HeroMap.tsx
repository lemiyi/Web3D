import { useNavigate } from 'react-router-dom'
import type { CarteHero } from '@/lib/carteHero'
import { contes, langueParCode, numeroDuConte, texteSur } from '@/lib/contenu'
import { BBOX, VIEWBOX, versViewBox } from '@/lib/projection'
import { useAppStore } from '@/store/useAppStore'

const [, , LARGEUR, HAUTEUR] = VIEWBOX
const PARALLELES = [10, 11, 12, 13, 14, 15]
const MERIDIENS = [-5, -4, -3, -2, -1, 0, 1, 2]

const graduation = (valeur: number, positif: string, negatif: string) =>
  `${Math.abs(valeur)}°${valeur >= 0 ? positif : negatif}`

// Cadre, grille de coordonnées (exacte : 1 degré) : visible avant l'arrivée des tracés.
function Grille() {
  return (
    <g aria-hidden="true" className="font-display" fontSize="11" letterSpacing="1">
      <rect
        x="1"
        y="1"
        width={LARGEUR - 2}
        height={HAUTEUR - 2}
        fill="none"
        stroke="#3a4796"
        strokeWidth="1.5"
      />
      {PARALLELES.map((lat) => {
        const { y } = versViewBox([BBOX.w, lat])
        return (
          <g key={lat}>
            <line x1="0" x2={LARGEUR} y1={y} y2={y} stroke="#26347f" strokeWidth=".7" />
            <text x="8" y={y - 4} fill="#8f9be0">
              {graduation(lat, 'N', 'S')}
            </text>
          </g>
        )
      })}
      {MERIDIENS.map((lon) => {
        const { x } = versViewBox([lon, BBOX.s])
        return (
          <g key={lon}>
            <line x1={x} x2={x} y1="0" y2={HAUTEUR} stroke="#26347f" strokeWidth=".7" />
            <text x={x + 4} y={HAUTEUR - 8} fill="#8f9be0">
              {graduation(lon, 'E', 'O')}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export default function HeroMap({ carte }: { carte: CarteHero | null }) {
  const navigate = useNavigate()
  const selectionner = useAppStore((s) => s.selectionner)

  const ouvrir = (id: string) => {
    selectionner(id)
    navigate('/carte')
  }

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role="group"
      aria-label="Carte en relief du Burkina Faso avec les contes"
      className="h-auto w-full lg:h-full lg:max-h-[calc(100svh-3.5rem)]"
    >
      <Grille />

      {carte && (
        <>
          <defs>
            <clipPath id="clip-pays">
              <path d={carte.pays} />
            </clipPath>
          </defs>

          <g clipPath="url(#clip-pays)">
            <path d={carte.pays} fill="var(--color-r0)" />
            {carte.bandes.map((b, i) => (
              <g
                key={b.min}
                className="bande"
                style={{ '--i': i } as React.CSSProperties}
                fill={`var(--color-r${i + 1})`}
                fillRule="evenodd"
                stroke="rgb(15 22 64 / 0.3)"
                strokeWidth=".5"
              >
                <path id={`bande-${i}`} d={b.d} />
              </g>
            ))}
            <g
              fill="none"
              stroke="var(--color-indigo)"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {carte.rivieres.map((r) => (
                <path key={r.nom} d={r.d} />
              ))}
            </g>
          </g>

          <g
            fill="none"
            stroke="rgb(15 22 64 / 0.55)"
            strokeWidth=".8"
            strokeDasharray="4 3"
          >
            {carte.regions.map((r) => (
              <path key={r.id} id={`region-${r.id}`} d={r.d} />
            ))}
          </g>
          <path
            d={carte.pays}
            fill="none"
            stroke="var(--color-os)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      )}

      {contes.map((conte, i) => {
        const { x, y } = versViewBox(conte.coordonnees)
        const langue = langueParCode(conte.langue)
        const couleur = langue?.couleur ?? '#fbf1d3'
        const aGauche = x > LARGEUR * 0.6
        return (
          <g
            key={conte.id}
            role="link"
            tabIndex={0}
            aria-label={`${numeroDuConte(conte.id)}. ${conte.titre.fr}, ${langue?.nom}`}
            onClick={() => ouvrir(conte.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                ouvrir(conte.id)
              }
            }}
            className="repere group cursor-pointer outline-none"
          >
            <circle cx={x} cy={y} r="34" fill="transparent" />
            <g className="repere-apparition" style={{ '--i': i } as React.CSSProperties}>
              <circle
                cx={x}
                cy={y}
                r="17"
                fill={couleur}
                stroke="var(--color-nuit)"
                strokeWidth="3.5"
                className="transition-transform duration-300 [transform-box:fill-box] [transform-origin:center] group-hover:scale-125 group-focus-visible:scale-125"
              />
              <circle
                cx={x}
                cy={y}
                r="21.5"
                fill="none"
                stroke="var(--color-os)"
                strokeWidth="1.5"
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <text
                x={x}
                y={y + 5.5}
                textAnchor="middle"
                fill={texteSur(couleur)}
                className="pointer-events-none font-display chiffres"
                fontSize="17"
                fontWeight="700"
              >
                {numeroDuConte(conte.id)}
              </text>
            </g>
            <text
              x={aGauche ? x - 28 : x + 28}
              y={y + 6}
              textAnchor={aGauche ? 'end' : 'start'}
              fill="var(--color-os)"
              stroke="var(--color-nuit)"
              strokeWidth="5"
              paintOrder="stroke"
              strokeLinejoin="round"
              className="pointer-events-none font-display opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              fontSize="19"
              fontWeight="600"
              letterSpacing="1"
            >
              {conte.titre.fr.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
