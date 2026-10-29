import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Ambiance } from '@/lib/ambiance'

export type PropsConteur = {
  ambiance: Ambiance
  parle: boolean // la voix est en train de lire
  impulsion: number // +1 à chaque mot
  phrase: number // rang de la phrase en cours
}

// Les couleurs viennent de token.css : le conteur porte la palette du site.
const css = (nom: string) =>
  new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(nom).trim())

const LUMIERE: Record<Ambiance, { cle: string; force: number; ciel: string }> = {
  aube: { cle: '--laterite-300', force: 2.6, ciel: '--laterite-100' },
  jour: { cle: '--ocre-100', force: 3.2, ciel: '--terre-50' },
  crepuscule: { cle: '--ocre-500', force: 2.8, ciel: '--laterite-300' },
  nuit: { cle: '--indigo-300', force: 2.0, ciel: '--indigo-700' },
}

const borner = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
const sortieRebond = (x: number) =>
  1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2)

const NB_POUSSIERES = 70

// Personnage stylisé et provisoire : aucun trait rituel ni motif sacré, un visage simplifié.
// Il sera remplacé par un modèle .glb quand l'équipe en aura un.
function Personnage({ ambiance, parle, impulsion, phrase }: PropsConteur) {
  const { viewport } = useThree()

  const groupe = useRef<THREE.Group>(null)
  const tete = useRef<THREE.Group>(null)
  const yeux = useRef<THREE.Group>(null)
  const bouche = useRef<THREE.Mesh>(null)
  const torse = useRef<THREE.Mesh>(null)
  const aura = useRef<THREE.Mesh>(null)
  const brasG = useRef<THREE.Group>(null)
  const brasD = useRef<THREE.Group>(null)
  const avantG = useRef<THREE.Group>(null)
  const avantD = useRef<THREE.Group>(null)
  const cle = useRef<THREE.DirectionalLight>(null)
  const ciel = useRef<THREE.HemisphereLight>(null)
  const poussiere = useRef<THREE.Points>(null)

  const matiere = useMemo(() => {
    const m = (couleur: string, rugosite = 0.85) =>
      new THREE.MeshStandardMaterial({
        color: css(couleur),
        roughness: rugosite,
        transparent: true,
      })
    return {
      robe: m('--indigo-700'),
      echarpe: m('--ocre-500'),
      peau: m('--terre-600', 0.7),
      bonnet: m('--laterite-500'),
      bande: m('--ocre-300'),
      blanc: m('--terre-50', 0.5),
      pupille: m('--terre-900', 0.4),
      bouche: m('--laterite-900', 0.6),
    }
  }, [])
  const toutes = useMemo(() => Object.values(matiere), [matiere])

  const lumieres = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(LUMIERE) as Ambiance[]).map((a) => [
          a,
          {
            cle: css(LUMIERE[a].cle),
            ciel: css(LUMIERE[a].ciel),
            force: LUMIERE[a].force,
          },
        ]),
      ) as Record<Ambiance, { cle: THREE.Color; ciel: THREE.Color; force: number }>,
    [],
  )
  const couleurAura = useMemo(() => css('--ocre-300'), [])
  const couleurSol = useMemo(() => css('--terre-900'), [])
  const positionsPoussiere = useMemo(() => {
    const p = new Float32Array(NB_POUSSIERES * 3)
    for (let i = 0; i < NB_POUSSIERES; i++) {
      p[i * 3] = (Math.random() - 0.5) * 2.4
      p[i * 3 + 1] = -1.2 + Math.random() * 1.8
      p[i * 3 + 2] = (Math.random() - 0.5) * 1.2
    }
    return p
  }, [])

  // Les props changent à chaque mot : on les lit dans useFrame sans relancer le rendu.
  const props = useRef({ parle, impulsion, phrase, ambiance })
  useEffect(() => {
    props.current = { parle, impulsion, phrase, ambiance }
  })

  const pointeur = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const surPointeur = (e: PointerEvent) => {
      pointeur.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('pointermove', surPointeur)
    return () => window.removeEventListener('pointermove', surPointeur)
  }, [])

  const s = useRef({
    vuImpulsion: impulsion,
    vuPhrase: phrase,
    env: 0, // enveloppe de la voix : 1 au début d'un mot, retombe vite
    geste: 0, // intensité des gestes
    cote: 0, // bras qui gesticule : 0 droit, 1 gauche
    nod: 0,
    clignementJusqua: 0,
    prochainClignement: 2.5,
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const st = s.current
    const {
      parle: voixActive,
      impulsion: imp,
      phrase: phr,
      ambiance: amb,
    } = props.current
    const g = groupe.current
    if (!g) return

    // Placement : à droite sur grand écran, au centre sur téléphone ; le bas du corps passe sous le panneau de texte.
    const w = viewport.width
    const h = viewport.height
    const large = w / h > 0.9
    const k = large ? 0.2 * h : Math.min(0.26 * h, 0.34 * w)
    const ox = large ? 0.26 * w : 0
    // Grand écran : le haut du corps dépasse au-dessus du panneau ; téléphone : la tête se place à 12 % au-dessus du centre.
    const oy = large ? -0.17 * h : 0.12 * h - 1.62 * k

    // Apparition : il émerge d'un nuage de poussière dorée.
    const a = borner((t - 0.5) / 1.7)
    const rebond = sortieRebond(a)
    g.scale.setScalar(Math.max(k * rebond, 0.0001))
    g.position.set(ox, oy - (1 - a) * h * 0.18, 0)
    g.rotation.y = (1 - a) * 0.8
    for (const m of toutes) m.opacity = a

    // Réactions à la voix.
    if (imp !== st.vuImpulsion) {
      st.vuImpulsion = imp
      st.env = 1
      st.nod = 0.1
    }
    if (phr !== st.vuPhrase) {
      st.vuPhrase = phr
      st.cote = Math.abs(phr) % 2
    }
    st.env = Math.max(0, st.env - dt * 3.5)
    st.nod = THREE.MathUtils.damp(st.nod, 0, 7, dt)
    st.geste = THREE.MathUtils.damp(st.geste, voixActive ? 1 : 0, 3, dt)

    // Respiration.
    const souffle = Math.sin(t * 1.7) * 0.012
    if (torse.current) torse.current.scale.y = 1 + souffle

    // Tête : suit doucement le curseur, hoche à chaque mot.
    if (tete.current) {
      tete.current.position.y = 1.62 + souffle
      tete.current.rotation.y = THREE.MathUtils.damp(
        tete.current.rotation.y,
        pointeur.current.x * 0.4,
        4,
        dt,
      )
      tete.current.rotation.x = THREE.MathUtils.damp(
        tete.current.rotation.x,
        -pointeur.current.y * 0.22 + st.nod,
        8,
        dt,
      )
    }

    // Bouche : s'ouvre à chaque mot, oscille pendant qu'il parle, se ferme au repos.
    if (bouche.current) {
      const ouverture = voixActive
        ? borner(0.3 + st.env * 0.7) * (0.55 + 0.45 * Math.sin(t * 17))
        : 0
      bouche.current.scale.set(1.7 - ouverture * 0.5, 0.2 + ouverture * 1.7, 0.45)
    }

    // Paupières.
    if (yeux.current) {
      if (t > st.prochainClignement) {
        st.clignementJusqua = t + 0.14
        st.prochainClignement = t + 2.5 + Math.random() * 3
      }
      yeux.current.scale.y = t < st.clignementJusqua ? 0.1 : 1
    }

    // Bras : repos le long du corps ; un bras se lève et balance à chaque phrase.
    const geste = (
      pivot: THREE.Group | null,
      avant: THREE.Group | null,
      cote: -1 | 1,
      actif: boolean,
    ) => {
      if (!pivot || !avant) return
      const force = st.geste * (actif ? 1 : 0.3)
      const leve = 0.12 + force * (0.75 + 0.3 * Math.sin(t * 2.4 + phr))
      pivot.rotation.z = THREE.MathUtils.damp(pivot.rotation.z, cote * leve, 5, dt)
      avant.rotation.x = THREE.MathUtils.damp(
        avant.rotation.x,
        -0.25 - force * 0.9,
        5,
        dt,
      )
    }
    geste(brasD.current, avantD.current, 1, st.cote === 0)
    geste(brasG.current, avantG.current, -1, st.cote === 1)

    // Halo derrière la tête : il bat avec la voix.
    if (aura.current) {
      aura.current.scale.setScalar(1 + st.env * 0.12 + Math.sin(t) * 0.02)
      ;(aura.current.material as THREE.MeshBasicMaterial).opacity =
        (0.15 + st.env * 0.2) * a
    }

    // Poussière d'apparition.
    const pts = poussiere.current
    if (pts) {
      const avancement = borner((t - 0.3) / 2.4)
      pts.visible = avancement < 1
      if (pts.visible) {
        const pos = pts.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < NB_POUSSIERES; i++)
          pos.setY(i, pos.getY(i) + dt * (0.25 + (i % 5) * 0.08))
        pos.needsUpdate = true
        ;(pts.material as THREE.PointsMaterial).opacity = (1 - avancement) * 0.9
      }
    }

    // La lumière suit l'heure du conte.
    const cible = lumieres[amb]
    const lisse = 1 - Math.exp(-dt * 2)
    if (cle.current) {
      cle.current.color.lerp(cible.cle, lisse)
      cle.current.intensity = THREE.MathUtils.damp(
        cle.current.intensity,
        cible.force,
        2,
        dt,
      )
    }
    if (ciel.current) ciel.current.color.lerp(cible.ciel, lisse)
  })

  const bras = (
    ref: React.RefObject<THREE.Group | null>,
    avant: React.RefObject<THREE.Group | null>,
    x: number,
  ) => (
    <group ref={ref} position={[x, 0.95, 0]}>
      <mesh material={matiere.robe} position={[0, -0.38, 0]}>
        <capsuleGeometry args={[0.15, 0.55, 6, 14]} />
      </mesh>
      <group ref={avant} position={[0, -0.78, 0]}>
        <mesh material={matiere.robe} position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.13, 0.45, 6, 14]} />
        </mesh>
        <mesh material={matiere.peau} position={[0, -0.66, 0]}>
          <sphereGeometry args={[0.15, 16, 12]} />
        </mesh>
      </group>
    </group>
  )

  return (
    <>
      <hemisphereLight ref={ciel} args={[lumieres.aube.ciel, couleurSol, 1.1]} />
      <directionalLight
        ref={cle}
        position={[2.5, 3.5, 4]}
        color={lumieres.aube.cle}
        intensity={2.6}
      />
      <directionalLight position={[-3, 1.5, -2]} color={couleurAura} intensity={1.4} />

      <group ref={groupe} scale={0.0001}>
        <mesh ref={aura} position={[0, 1.58, -0.7]}>
          <circleGeometry args={[1.35, 48]} />
          <meshBasicMaterial
            color={couleurAura}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={torse} material={matiere.robe} position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.7, 1.2, 8, 28]} />
        </mesh>
        <mesh material={matiere.robe} position={[0, 0.95, 0]} scale={[1.18, 0.5, 0.75]}>
          <sphereGeometry args={[0.68, 24, 16]} />
        </mesh>
        <mesh
          material={matiere.echarpe}
          position={[0, 0.5, 0.64]}
          rotation={[0.08, 0, -0.62]}
        >
          <boxGeometry args={[1.55, 0.17, 0.09]} />
        </mesh>
        <mesh material={matiere.peau} position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.3, 16]} />
        </mesh>

        <group ref={tete} position={[0, 1.62, 0]}>
          <mesh material={matiere.peau} scale={[0.95, 1.05, 0.95]}>
            <sphereGeometry args={[0.42, 32, 24]} />
          </mesh>
          <mesh
            material={matiere.bonnet}
            position={[0, 0.17, 0]}
            rotation={[-0.12, 0, 0]}
          >
            <sphereGeometry args={[0.46, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          </mesh>
          <mesh
            material={matiere.bande}
            position={[0, 0.16, 0]}
            rotation={[Math.PI / 2 - 0.12, 0, 0]}
          >
            <torusGeometry args={[0.45, 0.035, 8, 36]} />
          </mesh>
          <group ref={yeux} position={[0, 0.04, 0.36]}>
            {[-0.15, 0.15].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh material={matiere.blanc} scale={[1, 1, 0.6]}>
                  <sphereGeometry args={[0.075, 16, 12]} />
                </mesh>
                <mesh material={matiere.pupille} position={[0, 0, 0.04]}>
                  <sphereGeometry args={[0.04, 12, 10]} />
                </mesh>
              </group>
            ))}
          </group>
          <mesh
            ref={bouche}
            material={matiere.bouche}
            position={[0, -0.17, 0.385]}
            scale={[1.7, 0.2, 0.45]}
          >
            <sphereGeometry args={[0.07, 16, 12]} />
          </mesh>
        </group>

        {bras(brasD, avantD, 0.8)}
        {bras(brasG, avantG, -0.8)}

        <points ref={poussiere}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positionsPoussiere, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color={couleurAura}
            size={0.07}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </points>
      </group>
    </>
  )
}

export default function Conteur3D(props: PropsConteur) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 10], fov: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Personnage {...props} />
    </Canvas>
  )
}
