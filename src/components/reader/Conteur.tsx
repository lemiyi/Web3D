import { useReducedMotion } from 'motion/react'
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import ConteurFixe from '@/components/reader/ConteurFixe'
import type { PropsConteur } from '@/components/reader/Conteur3D'

// Three.js ne se charge que sur la page du lecteur, et seulement si le personnage 3D peut s'afficher.
const Conteur3D = lazy(() => import('@/components/reader/Conteur3D'))

function webglDisponible() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

// Appareil très modeste : le repli 2D est plus sûr que du WebGL.
function appareilLent() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2
}

// Une erreur WebGL ne doit jamais casser la lecture du conte : on retombe sur le personnage 2D.
class BorneErreur extends Component<
  { repli: ReactNode; children: ReactNode },
  { erreur: boolean }
> {
  state = { erreur: false }
  static getDerivedStateFromError() {
    return { erreur: true }
  }
  render() {
    return this.state.erreur ? this.props.repli : this.props.children
  }
}

export default function Conteur(props: PropsConteur) {
  const reduit = useReducedMotion()
  const [webgl] = useState(() => webglDisponible() && !appareilLent())

  // Le texte et les commandes d'abord : le conteur apparaît juste après, ou tout de suite si l'écoute est lancée.
  const [pret, setPret] = useState(false)
  useEffect(() => {
    const delai = window.setTimeout(() => setPret(true), 1500)
    return () => window.clearTimeout(delai)
  }, [])

  if (reduit || !webgl) return <ConteurFixe parle={props.parle} />
  if (!pret && !props.parle) return null
  return (
    <BorneErreur repli={<ConteurFixe parle={props.parle} />}>
      <Suspense fallback={<ConteurFixe parle={props.parle} />}>
        <Conteur3D {...props} />
      </Suspense>
    </BorneErreur>
  )
}
