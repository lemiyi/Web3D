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
import { contes, langueParCode, numeroDuConte } from '@/lib/contenu'
import { LIBELLES_TYPE } from '@/lib/filtres'
import { useAppStore } from '@/store/useAppStore'

type Etape = {
  langue: string
  regions: string[]
  titre: string
  texte: string
  fond: string
  teinte: number // bande de relief qui donne la couleur du fond
  latitude: number
}

// Du nord au sud : la couleur du fond suit les bandes de relief, la règle suit la latitude du chef-lieu.
const ETAPES: Etape[] = [
  {
    langue: 'fulfulde',
    regions: ['sahel'],
    titre: 'Le Sahel parle fulfuldé',
    texte:
      "Dans le nord, autour de Dori, le fulfuldé est la langue des Peuls, un peuple d'éleveurs qui mène ses troupeaux de pâturage en pâturage.",
    fond: 'bg-r2 text-nuit',
    teinte: 2,
    latitude: 14.0,
  },
  {
    langue: 'moore',
    regions: ['centre', 'plateau-central', 'centre-nord'],
    titre: 'Le Centre parle mooré',
    texte:
      "Autour de Ouagadougou et sur le plateau, le mooré est la langue des Mossi. C'est là que se raconte la légende de la princesse Yennenga, mère des royaumes mossi.",
    fond: 'bg-r3 text-nuit',
    teinte: 3,
    latitude: 12.4,
  },
  {
    langue: 'gulmancema',
    regions: ['est'],
    titre: "L'Est parle gulmancema",
    texte:
      'Autour de Fada N’Gourma, le gulmancema est la langue des Gulmance, des agriculteurs qui vivent aux côtés d’éleveurs peuls.',
    fond: 'bg-r4 text-os',
    teinte: 4,
    latitude: 12.1,
  },
  {
    langue: 'dioula',
    regions: ['hauts-bassins', 'cascades'],
    titre: "L'Ouest parle dioula",
    texte:
      "À Bobo-Dioulasso et dans les Cascades, on parle le dioula, une langue mandé. C'est aussi à l'ouest que se trouvent les reliefs les plus élevés du pays.",
    fond: 'bg-r0 text-nuit',
    teinte: 0,
    latitude: 11.2,
  },
]

function Silhouette({
  carte,
  regionIds,
}: {
  carte: CarteHero | null
  regionIds: string[]
}) {
  if (!carte) return <div className="h-72 lg:h-[26rem]" />
  const regions = carte.regions.filter((r) => regionIds.includes(r.id))
  const x0 = Math.min(...regions.map((r) => r.bbox[0]))
  const y0 = Math.min(...regions.map((r) => r.bbox[1]))
  const x1 = Math.max(...regions.map((r) => r.bbox[0] + r.bbox[2]))
  const y1 = Math.max(...regions.map((r) => r.bbox[1] + r.bbox[3]))
  const marge = 10
  const clip = `clip-${regionIds.join('-')}`
  return (
    <svg
      aria-hidden="true"
      viewBox={`${x0 - marge} ${y0 - marge} ${x1 - x0 + 2 * marge} ${y1 - y0 + 2 * marge}`}
      className="h-72 w-full lg:h-[26rem]"
    >
      <defs>
        <clipPath id={clip}>
          {regions.map((r) => (
            <use key={r.id} href={`#region-${r.id}`} />
          ))}
        </clipPath>
      </defs>
      {regions.map((r) => (
        <use key={r.id} href={`#region-${r.id}`} fill="var(--color-nuit)" stroke="none" />
      ))}
      <g clipPath={`url(#${clip})`} fill="none" strokeWidth=".9">
        {carte.bandes.map((b, i) => (
          <use key={b.min} href={`#bande-${i}`} stroke={`var(--color-r${i + 1})`} />
        ))}
      </g>
      {regions.map((r) => (
        <use
          key={r.id}
          href={`#region-${r.id}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}

function ListeContes({ langue }: { langue: string }) {
  const navigate = useNavigate()
  const selectionner = useAppStore((s) => s.selectionner)
  const liste = contes.filter((c) => c.langue === langue)
  const couleur = langueParCode(langue)?.couleur
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
            className="group flex w-full items-center gap-4 py-3.5 text-left transition-colors duration-200 hover:bg-current/10"
          >
            <span
              aria-hidden="true"
              className="chiffres grid size-9 shrink-0 place-items-center rounded-full border-[3px] border-nuit font-display text-lg font-bold text-os"
              style={{ background: couleur }}
            >
              {numeroDuConte(c.id)}
            </span>
            <span className="flex-1">
              <span className="block font-display text-2xl font-semibold uppercase leading-tight tracking-wide">
                {c.titre.fr}
              </span>
              <span className="chiffres block text-base opacity-80">
                {LIBELLES_TYPE[c.type]} · {c.dureeMinutes} min
                {!c.conteur.consentement && ' · contenu provisoire'}
              </span>
            </span>
            <span className="font-display text-lg font-semibold uppercase tracking-wider underline underline-offset-4 decoration-2 group-hover:decoration-4">
              Sur la carte
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

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
    [0, 0.34, 0.67, 1],
    ETAPES.map((e) => e.latitude),
  )
  const texte = useTransform(lat, (v) => `${v.toFixed(1).replace('.', ',')}° N`)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 lg:block"
    >
      <div className="sticky top-14 flex h-[calc(100svh-3.5rem)] flex-col items-center gap-4 py-10">
        <motion.span className="chiffres bg-nuit px-2.5 py-1 font-display text-xl font-bold tracking-wider text-os">
          {texte}
        </motion.span>
        <div className="relative w-1.5 flex-1 bg-nuit/25">
          <motion.div
            className="absolute inset-0 origin-top bg-nuit"
            style={{ scaleY: p }}
          />
        </div>
      </div>
    </div>
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
                className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold uppercase leading-[0.92] text-balance"
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
