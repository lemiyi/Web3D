import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AMBIANCES, type Ambiance } from '@/lib/ambiance'

type Props = {
  ambiance: Ambiance
  parle: boolean // la voix est en train de lire
  impulsion: number // +1 à chaque mot
  phrase: number // rang de la phrase en cours
}

const SORTIE = [0.16, 1, 0.3, 1] as const

// Où se tient l'astre selon l'ambiance : il se lève avec le conte.
const ASTRE: Record<Ambiance, { x: number; y: number; echelle: number; soleil: number }> =
  {
    aube: { x: 300, y: 600, echelle: 1.1, soleil: 1 },
    jour: { x: 1060, y: 230, echelle: 1, soleil: 1 },
    crepuscule: { x: 1270, y: 570, echelle: 1.3, soleil: 1 },
    nuit: { x: 420, y: 220, echelle: 1, soleil: 0 },
  }

// Voile de couleur posé sur le paysage : il donne l'heure de la journée.
const VOILE: Record<Ambiance, { couleur: string; opacite: number }> = {
  aube: { couleur: 'var(--laterite-300)', opacite: 0.2 },
  jour: { couleur: 'var(--ocre-100)', opacite: 0 },
  crepuscule: { couleur: 'var(--laterite-700)', opacite: 0.3 },
  nuit: { couleur: 'var(--indigo-900)', opacite: 0.62 },
}

const COLLINES = [
  {
    d: 'M0 560 C200 480 380 540 560 500 S900 440 1100 510 S1450 470 1600 520 V900 H0Z',
    couleur: 'var(--relief-0)',
    mouvement: -8,
  },
  {
    d: 'M0 640 C220 580 420 650 650 610 S1000 560 1250 620 S1500 600 1600 630 V900 H0Z',
    couleur: 'var(--relief-1)',
    mouvement: -14,
  },
  {
    d: 'M0 720 C260 670 480 730 760 700 S1180 650 1400 710 S1550 700 1600 720 V900 H0Z',
    couleur: 'var(--relief-2)',
    mouvement: -22,
  },
  {
    d: 'M0 790 C300 750 560 800 860 775 S1300 740 1600 790 V900 H0Z',
    couleur: 'var(--relief-3)',
    mouvement: -34,
  },
  {
    d: 'M0 850 C340 820 620 860 900 840 S1400 820 1600 850 V900 H0Z',
    couleur: 'var(--relief-4)',
    mouvement: -50,
  },
]

// Positions pseudo-aléatoires fixes : le ciel étoilé est le même à chaque visite.
function etoiles(n: number) {
  let graine = 7
  const hasard = () => {
    graine = (graine * 16807) % 2147483647
    return graine / 2147483647
  }
  return Array.from({ length: n }, () => ({
    x: Math.round(hasard() * 1600),
    y: Math.round(hasard() * 380),
    r: 1 + hasard() * 1.8,
    delai: hasard() * 4,
  }))
}

const LUCIOLES = [
  [220, 640],
  [520, 700],
  [760, 600],
  [980, 690],
  [1180, 630],
  [1400, 720],
  [330, 760],
  [640, 780],
  [900, 740],
  [1320, 780],
  [140, 720],
  [1500, 660],
]

function Couche({
  mx,
  mouvement,
  rang,
  children,
}: {
  mx: MotionValue<number>
  mouvement: number
  rang: number
  children: ReactNode
}) {
  const x = useTransform(mx, (v) => v * mouvement)
  return (
    <motion.g
      style={{ x }}
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, delay: rang * 0.12, ease: SORTIE }}
    >
      {children}
    </motion.g>
  )
}

// Illustration provisoire codée en SVG : un paysage de savane en couches qui change d'heure avec le conte
// et qui « parle » : l'astre bat au rythme des mots, des ondes partent à chaque phrase.
export default function PaysageAnime({ ambiance, parle, impulsion, phrase }: Props) {
  const reduit = useReducedMotion()
  const astre = ASTRE[ambiance]
  const ciel = useMemo(() => etoiles(42), [])

  const mx = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 })
  useEffect(() => {
    if (reduit) return
    const surPointeur = (e: PointerEvent) =>
      mx.set((e.clientX / window.innerWidth - 0.5) * 2)
    window.addEventListener('pointermove', surPointeur)
    return () => window.removeEventListener('pointermove', surPointeur)
  }, [mx, reduit])

  // Battement de l'astre : chaque mot le gonfle puis il retombe.
  const battement = useMotionValue(1)
  useEffect(() => {
    if (reduit || !parle) return
    battement.set(1.16)
    const lecture = animate(battement, 1, { duration: 0.45, ease: 'easeOut' })
    return () => lecture.stop()
  }, [impulsion, parle, reduit, battement])

  // Une onde par phrase.
  const [ondes, setOndes] = useState<number[]>([])
  useEffect(() => {
    if (reduit || !parle || phrase < 0) return
    const id = Date.now()
    setOndes((o) => [...o, id])
    const retrait = window.setTimeout(
      () => setOndes((o) => o.filter((x) => x !== id)),
      1600,
    )
    return () => window.clearTimeout(retrait)
  }, [phrase, parle, reduit])

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {AMBIANCES.map((a) => (
        <motion.div
          key={a}
          className="absolute inset-0"
          style={{ background: `var(--scene-${a})` }}
          initial={false}
          animate={{ opacity: a === ambiance ? 1 : 0 }}
          transition={{ duration: 1.6 }}
        />
      ))}

      <motion.div
        className="absolute inset-0"
        animate={{ scale: parle && !reduit ? 1.07 : 1 }}
        transition={{ duration: 24, ease: 'linear' }}
      >
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <radialGradient id="halo">
              <stop offset="0%" stopColor="var(--ocre-300)" stopOpacity=".85" />
              <stop offset="100%" stopColor="var(--ocre-300)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <motion.g
            initial={false}
            animate={{ opacity: ambiance === 'nuit' ? 1 : 0 }}
            transition={{ duration: 1.6 }}
          >
            {ciel.map((e, i) => (
              <circle
                key={i}
                cx={e.x}
                cy={e.y}
                r={e.r}
                fill="var(--terre-50)"
                className="etoile"
                style={{ animationDelay: `${e.delai}s` }}
              />
            ))}
          </motion.g>

          <motion.g
            initial={{ x: astre.x, y: astre.y + 140, scale: 0.6, opacity: 0 }}
            animate={{ x: astre.x, y: astre.y, scale: astre.echelle, opacity: 1 }}
            transition={{ duration: 2.4, ease: SORTIE }}
          >
            <motion.g style={{ scale: battement }}>
              <circle
                r="230"
                fill="url(#halo)"
                opacity={ambiance === 'nuit' ? 0.35 : 1}
              />
            </motion.g>
            {ondes.map((id) => (
              <motion.circle
                key={id}
                r={70}
                fill="none"
                stroke="var(--ocre-300)"
                strokeWidth="3"
                initial={{ r: 70, opacity: 0.7 }}
                animate={{ r: 330, opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            ))}
            <motion.circle
              r="64"
              fill="var(--ocre-300)"
              initial={false}
              animate={{ opacity: astre.soleil }}
              transition={{ duration: 1.6 }}
            />
            <motion.g
              initial={false}
              animate={{ opacity: 1 - astre.soleil }}
              transition={{ duration: 1.6 }}
            >
              <circle r="52" fill="var(--terre-50)" />
              <circle cx="-14" cy="-10" r="9" fill="var(--terre-200)" />
              <circle cx="16" cy="12" r="6" fill="var(--terre-200)" />
              <circle cx="14" cy="-20" r="4" fill="var(--terre-200)" />
            </motion.g>
          </motion.g>

          {COLLINES.map((c, i) => (
            <Couche key={c.couleur} mx={mx} mouvement={c.mouvement} rang={i + 1}>
              <path
                d={c.d}
                fill={c.couleur}
                stroke="var(--terre-900)"
                strokeOpacity=".4"
                strokeWidth="2.5"
              />
              {i === 2 && (
                // baobab sur la troisième colline
                <g fill="var(--terre-900)">
                  <path d="M1212 702 C1190 640 1200 565 1234 524 L1266 524 C1300 565 1310 640 1288 702Z" />
                  <path
                    d="M1234 530 C1200 500 1178 500 1160 480 M1266 530 C1300 500 1322 500 1340 478 M1250 524 C1250 500 1240 486 1236 470"
                    stroke="var(--terre-900)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <ellipse cx="1250" cy="474" rx="84" ry="24" />
                  <ellipse cx="1164" cy="482" rx="44" ry="16" />
                  <ellipse cx="1338" cy="480" rx="44" ry="16" />
                </g>
              )}
              {i === 3 && (
                // acacia sur la quatrième
                <g
                  fill="var(--terre-900)"
                  stroke="var(--terre-900)"
                  strokeLinecap="round"
                >
                  <path
                    d="M330 786 V736 Q330 716 308 702 M330 736 Q334 718 356 704"
                    strokeWidth="9"
                    fill="none"
                  />
                  <ellipse cx="330" cy="694" rx="118" ry="20" />
                  <ellipse cx="292" cy="710" rx="58" ry="12" />
                  <ellipse cx="372" cy="708" rx="62" ry="13" />
                </g>
              )}
            </Couche>
          ))}

          {AMBIANCES.map((a) => (
            <motion.rect
              key={a}
              width="1600"
              height="900"
              fill={VOILE[a].couleur}
              initial={false}
              animate={{ opacity: a === ambiance ? VOILE[a].opacite : 0 }}
              transition={{ duration: 1.6 }}
            />
          ))}

          <motion.g
            initial={false}
            animate={{
              opacity: ambiance === 'nuit' ? 1 : ambiance === 'crepuscule' ? 0.7 : 0,
            }}
            transition={{ duration: 1.6 }}
          >
            {LUCIOLES.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                fill="var(--ocre-300)"
                className="luciole"
                style={{
                  animationDelay: `${(i * 0.7) % 5}s`,
                  animationDuration: `${5 + (i % 4)}s`,
                }}
              />
            ))}
          </motion.g>
        </svg>
      </motion.div>
    </div>
  )
}
