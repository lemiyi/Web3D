import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

// Le chiffre s'incrémente à l'apparition ; sans animation si la personne l'a demandé.
export default function Compteur({ valeur }: { valeur: number }) {
  const reduit = useReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (reduit) return
    const lecture = animate(0, valeur, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => lecture.stop()
  }, [valeur, reduit])

  return <span className="chiffres">{reduit ? valeur : n}</span>
}
