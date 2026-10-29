import { useNavigate } from 'react-router-dom'
import type { CarteHero } from '@/lib/carteHero'
import { contes, couleurLangue, langueParCode, numeroDuConte } from '@/lib/contenu'
import { BBOX, VIEWBOX, versViewBox } from '@/lib/projection'
import { NB_BANDES } from '@/lib/relief'
import { useAppStore } from '@/store/useAppStore'

const [, , LARGEUR, HAUTEUR] = VIEWBOX
const PARALLELES = [10, 11, 12, 13, 14, 15]
const MERIDIENS = [-5, -4, -3, -2, -1, 0, 1, 2]

const graduation = (valeur: number, positif: string, negatif: string) =>
  `${Math.abs(valeur)}°${valeur >= 0 ? positif : negatif}`

// Cadre et grille de coordonnées (exacte : 1 degré) : visibles avant l'arrivée des tracés.
function Grille() {
  return (
    <g aria-hidden="true" fontSize="11" fontWeight="600" letterSpacing=".5">
      <rect
        x="1"
        y="1"
        width={LARGEUR - 2}
        height={HAUTEUR - 2}
        rx="18"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
      />
      {PARALLELES.map((lat) => {
        const { y } = versViewBox([BBOX.w, lat])
        return (
          <g key={lat}>
            <line
              x1="0"
              x2={LARGEUR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth=".8"
            />
            <text x="12" y={y - 4} fill="var(--text-muted)">
              {graduation(lat, 'N', 'S')}
            </text>
          </g>
        )
      })}
      {MERIDIENS.map((lon) => {
        const { x } = versViewBox([lon, BBOX.s])
        return (
          <g key={lon}>
            <line
              x1={x}
              x2={x}
              y1="0"
              y2={HAUTEUR}
              stroke="var(--border)"
              strokeWidth=".8"
            />
            <text x={x + 4} y={HAUTEUR - 10} fill="var(--text-muted)">
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
      className="h-auto w-full lg:h-full lg:max-h-[calc(100svh-9rem)]"
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
            <path d={carte.pays} fill="var(--relief-0)" />
            {carte.bandes.slice(0, NB_BANDES - 1).map((b, i) => (
              <g
                key={b.min}
                className="bande"
                style={{ '--i': i } as React.CSSProperties}
                fill={`var(--relief-${i + 1})`}
                fillRule="evenodd"
                stroke="var(--terre-900)"
                strokeOpacity=".3"
                strokeWidth=".5"
              >
                <path id={`bande-${i}`} d={b.d} />
              </g>
            ))}
            <g
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              {carte.rivieres.map((r) => (
                <path key={r.nom} d={r.d} />
              ))}
            </g>
          </g>

          <g
            fill="none"
            stroke="var(--terre-900)"
            strokeOpacity=".5"
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
            stroke="var(--text)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </>
      )}

      {contes.map((conte, i) => {
        const { x, y } = versViewBox(conte.coordonnees)
        const langue = langueParCode(conte.langue)
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
            <circle cx={x} cy={y} r="45" fill="transparent" />
            <g className="repere-apparition" style={{ '--i': i } as React.CSSProperties}>
              <circle
                cx={x}
                cy={y}
                r="17"
                fill={couleurLangue(conte.langue)}
                stroke="var(--surface)"
                strokeWidth="3.5"
                className="transition-transform duration-300 [transform-box:fill-box] [transform-origin:center] group-hover:scale-125 group-focus-visible:scale-125"
              />
              <circle
                cx={x}
                cy={y}
                r="22"
                fill="none"
                stroke="var(--text)"
                strokeWidth="2"
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <text
                x={x}
                y={y + 6}
                textAnchor="middle"
                fill="var(--on-lang)"
                className="chiffres pointer-events-none font-display"
                fontSize="17"
                fontWeight="800"
              >
                {numeroDuConte(conte.id)}
              </text>
            </g>
            <text
              x={aGauche ? x - 28 : x + 28}
              y={y + 6}
              textAnchor={aGauche ? 'end' : 'start'}
              fill="var(--text)"
              stroke="var(--surface)"
              strokeWidth="5"
              paintOrder="stroke"
              strokeLinejoin="round"
              className="pointer-events-none font-display opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              fontSize="19"
              fontWeight="700"
            >
              {conte.titre.fr}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
