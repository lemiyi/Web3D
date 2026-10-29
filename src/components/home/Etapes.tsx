import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CarteHero } from '@/lib/carteHero'
import { contes, couleurLangue, numeroDuConte } from '@/lib/contenu'
import { LIBELLES_TYPE } from '@/lib/filtres'
import { useAppStore } from '@/store/useAppStore'

type Etape = {
  langue: string
  regions: string[]
  titre: string
  texte: string
  fond: string // la couleur du fond suit une bande de relief
  latitude: number // latitude du chef-lieu, lue par la règle
}

// Du nord au sud.
const ETAPES: Etape[] = [
  {
    langue: 'fulfulde',
    regions: ['sahel'],
    titre: 'Le Sahel parle fulfuldé',
    texte:
      "Dans le nord, autour de Dori, le fulfuldé est la langue des Peuls, un peuple d'éleveurs qui mène ses troupeaux de pâturage en pâturage.",
    fond: 'bg-relief-2 text-terre-900',
    latitude: 14.0,
  },
  {
    langue: 'moore',
    regions: ['centre', 'plateau-central', 'centre-nord'],
    titre: 'Le Centre parle mooré',
    texte:
      "Autour de Ouagadougou et sur le plateau, le mooré est la langue des Mossi. C'est là que se raconte la légende de la princesse Yennenga, mère des royaumes mossi.",
    fond: 'bg-relief-3 text-terre-900',
    latitude: 12.4,
  },
  {
    langue: 'gulmancema',
    regions: ['est'],
    titre: "L'Est parle gulmancema",
    texte:
      'Autour de Fada N’Gourma, le gulmancema est la langue des Gulmance, des agriculteurs qui vivent aux côtés d’éleveurs peuls.',
    fond: 'bg-relief-4 text-terre-50',
    latitude: 12.1,
  },
  {
    langue: 'dioula',
    regions: ['hauts-bassins', 'cascades'],
    titre: "L'Ouest parle dioula",
    texte:
      "À Bobo-Dioulasso et dans les Cascades, on parle le dioula, une langue mandé. C'est aussi à l'ouest que se trouvent les reliefs les plus élevés du pays.",
    fond: 'bg-relief-0 text-terre-900',
    latitude: 11.2,
  },
  {
    langue: 'dagara',
    regions: ['sud-ouest'],
    titre: 'Le Sud-Ouest parle dagara',
    texte:
      'Autour de Gaoua, le dagara compte parmi les langues parlées dans le sud-ouest du pays, tout près de la frontière avec le Ghana et la Côte d’Ivoire.',
    fond: 'bg-relief-1 text-terre-900',
    latitude: 10.3,
  },
]

// La région est peinte avec les vraies bandes d'altitude (réutilisées depuis la carte du premier écran).
function Silhouette({
  carte,
  regionIds,
}: {
  carte: CarteHero | null
  regionIds: string[]
}) {
  if (!carte) return <div className="h-80 lg:h-[32rem]" />
  const regions = carte.regions.filter((r) => regionIds.includes(r.id))
  const x0 = Math.min(...regions.map((r) => r.bbox[0]))
  const y0 = Math.min(...regions.map((r) => r.bbox[1]))
  const x1 = Math.max(...regions.map((r) => r.bbox[0] + r.bbox[2]))
  const y1 = Math.max(...regions.map((r) => r.bbox[1] + r.bbox[3]))
  const marge = 8
  const clip = `clip-${regionIds.join('-')}`
  return (
    <svg
      aria-hidden="true"
      viewBox={`${x0 - marge} ${y0 - marge} ${x1 - x0 + 2 * marge} ${y1 - y0 + 2 * marge}`}
      className="h-80 w-full overflow-visible lg:h-[32rem]"
      style={{
        filter:
          'drop-shadow(0 12px 16px color-mix(in srgb, var(--terre-900) 40%, transparent))',
      }}
    >
      <defs>
        <clipPath id={clip}>
          {regions.map((r) => (
            <use key={r.id} href={`#region-${r.id}`} />
          ))}
        </clipPath>
      </defs>
      {regions.map((r) => (
        <use key={r.id} href={`#region-${r.id}`} fill="var(--relief-0)" stroke="none" />
      ))}
      <g clipPath={`url(#${clip})`}>
        {carte.bandes.map((b, i) => (
          <use
            key={b.min}
            href={`#bande-${i}`}
            fill={`var(--relief-${i + 1})`}
            fillRule="evenodd"
            stroke="var(--terre-900)"
            strokeOpacity=".3"
            strokeWidth=".6"
          />
        ))}
      </g>
      {regions.map((r) => (
        <use
          key={r.id}
          href={`#region-${r.id}`}
          fill="none"
          stroke="var(--terre-900)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

function ListeContes({ langue }: { langue: string }) {
  const navigate = useNavigate()
  const selectionner = useAppStore((s) => s.selectionner)
  const liste = contes.filter((c) => c.langue === langue)
  return (
    <ul className="mt-8 border-t border-current/30">
      {liste.map((c) => (
        <li key={c.id} className="border-b border-current/30">
          <button
            type="button"
            onClick={() => {
              selectionner(c.id)
              navigate('/carte')
            }}
            className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-left transition-colors duration-200 hover:bg-current/10"
          >
            <span
              aria-hidden="true"
              className="chiffres grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-terre-900 font-display text-lg font-extrabold text-sur-lang"
              style={{ background: couleurLangue(langue) }}
            >
              {numeroDuConte(c.id)}
            </span>
            <span className="min-w-0 flex-1 basis-40">
              <span className="block font-display text-xl font-bold leading-tight tracking-tight">
                {c.titre.fr}
              </span>
              <span className="chiffres block text-base">
                {LIBELLES_TYPE[c.type]} · {c.dureeMinutes} min
                {!c.conteur.consentement && ' · contenu provisoire'}
              </span>
            </span>
            <span className="ml-[3.5rem] text-base font-bold underline decoration-2 underline-offset-4 group-hover:decoration-4 sm:ml-0">
              Sur la carte
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// Règle de latitude : verticale sur grand écran, barre collante sous la pilule sur téléphone.
function Regle({
  progression,
}: {
  progression: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const reduit = useReducedMotion()
  const amorti = useSpring(progression, { stiffness: 90, damping: 26, mass: 0.5 })
  const p = reduit ? progression : amorti
  const lat = useTransform(
    p,
    ETAPES.map((_, i) => i / (ETAPES.length - 1)),
    ETAPES.map((e) => e.latitude),
  )
  const texte = useTransform(lat, (v) => `${v.toFixed(1).replace('.', ',')}° N`)
  return (
    <>
      <div
        aria-hidden="true"
        className="sticky top-[4.6rem] z-20 mx-3 flex items-center gap-3 rounded-full bg-terre-900 px-4 py-2 text-terre-50 lg:hidden"
      >
        <motion.span className="chiffres w-20 font-display text-lg font-extrabold tracking-tight">
          {texte}
        </motion.span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-terre-50/25">
          <motion.div
            className="absolute inset-0 origin-left bg-terre-50"
            style={{ scaleX: p }}
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 lg:block"
      >
        <div className="sticky top-[4.5rem] flex h-[calc(100svh-4.5rem)] flex-col items-center gap-4 py-10">
          <motion.span className="chiffres rounded-full bg-terre-900 px-3 py-1 font-display text-xl font-extrabold tracking-tight text-terre-50">
            {texte}
          </motion.span>
          <div className="relative w-1.5 flex-1 overflow-hidden rounded-full bg-terre-900/25">
            <motion.div
              className="absolute inset-0 origin-top bg-terre-900"
              style={{ scaleY: p }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default function Etapes({ carte }: { carte: CarteHero | null }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: conteneur,
    offset: ['start start', 'end end'],
  })

  return (
    <div ref={conteneur} className="relative">
      <Regle progression={scrollYProgress} />
      {ETAPES.map((etape, i) => (
        <section
          key={etape.langue}
          aria-labelledby={`etape-${etape.langue}`}
          className={`sur-teinte ${etape.fond}`}
        >
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28 lg:pl-32">
            <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
              <Silhouette carte={carte} regionIds={etape.regions} />
            </div>
            <div>
              <h2
                id={`etape-${etape.langue}`}
                className="font-display text-[clamp(2.25rem,6vw,4.25rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-balance"
              >
                {etape.titre}
              </h2>
              <p className="mt-5 max-w-[48ch] font-serif text-xl leading-relaxed">
                {etape.texte}
              </p>
              <ListeContes langue={etape.langue} />
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
