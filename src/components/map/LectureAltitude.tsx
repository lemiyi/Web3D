import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { altitudeEn } from '@/lib/altitude'

export type LectureAltitudeRef = { afficher: (lon: number, lat: number) => void }

type Lecture = { alt: number | null; lon: number; lat: number }

const nombre = new Intl.NumberFormat('fr-FR')
const degres = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toFixed(2).replace('.', ',')}° ${v >= 0 ? pos : neg}`

// L'altitude du point visé : elle change à chaque mouvement, donc elle vit dans son propre composant
// pour ne pas redessiner toute la carte.
export default function LectureAltitude({
  ref,
  className = '',
}: {
  ref: Ref<LectureAltitudeRef>
  className?: string
}) {
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const attente = useRef<[number, number] | null>(null)
  const minuterie = useRef<number | undefined>(undefined)
  const jeton = useRef(0)

  useImperativeHandle(ref, () => ({
    // Au plus une lecture toutes les 90 ms, avec toujours la dernière position demandée.
    afficher(lon, lat) {
      attente.current = [lon, lat]
      if (minuterie.current) return
      minuterie.current = window.setTimeout(() => {
        minuterie.current = undefined
        const p = attente.current
        if (!p) return
        const mien = ++jeton.current
        void altitudeEn(p[0], p[1]).then((alt) => {
          if (mien === jeton.current) setLecture({ alt, lon: p[0], lat: p[1] })
        })
      }, 90)
    },
  }))

  useEffect(() => () => window.clearTimeout(minuterie.current), [])

  return (
    <div
      className={`verre-dense flottant pointer-events-none flex items-baseline justify-center gap-x-3 rounded-3xl px-4 py-2 text-center ${className}`}
    >
      {lecture ? (
        <>
          <span className="text-sm font-semibold text-discret">Altitude</span>
          <span className="chiffres font-display text-xl font-extrabold leading-none">
            {lecture.alt === null
              ? '—'
              : lecture.alt <= 0
                ? 'Mer'
                : `${nombre.format(lecture.alt)} m`}
          </span>
          <span className="chiffres hidden text-sm text-discret sm:inline">
            {degres(lecture.lat, 'N', 'S')} · {degres(lecture.lon, 'E', 'O')}
          </span>
        </>
      ) : (
        <span className="text-sm font-semibold text-discret">
          Pointez ou touchez la carte pour lire l’altitude
        </span>
      )}
    </div>
  )
}
