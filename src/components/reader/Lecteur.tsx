import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Choix from '@/components/reader/Choix'
import Commandes from '@/components/reader/Commandes'
import Conteur from '@/components/reader/Conteur'
import FinDeConte from '@/components/reader/FinDeConte'
import PaysageAnime from '@/components/reader/PaysageAnime'
import TexteSynchronise from '@/components/reader/TexteSynchronise'
import { ambianceParRang } from '@/lib/ambiance'
import { couleurLangue, langueParCode, numeroDuConte } from '@/lib/contenu'
import { nettoyerPourVoix, rangDePhrase } from '@/lib/narration'
import type { Conte } from '@/lib/schemas'
import { useNarration } from '@/lib/useNarration'

const PAUSE_ENTRE_SCENES_MS = 700

export default function Lecteur({ conte }: { conte: Conte }) {
  // Le son ne démarre que si la personne a cliqué sur « Écouter le conte » (jamais automatiquement).
  const demandeEcoute =
    (useLocation().state as { lecture?: boolean } | null)?.lecture === true
  const n = useNarration()

  const [chemin, setChemin] = useState([conte.scenes[0].id])
  const [essai, setEssai] = useState(0) // relance la scène de départ quand on réécoute
  const [enLecture, setEnLecture] = useState(demandeEcoute)
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [fini, setFini] = useState(false)
  const [onglet, setOnglet] = useState<'fr' | 'langue'>('fr')

  const sceneId = chemin[chemin.length - 1]
  const scene = conte.scenes.find((s) => s.id === sceneId)!
  const ambiance = scene.ambiance ?? ambianceParRang(chemin.length - 1)
  const langue = langueParCode(conte.langue)

  const enLectureRef = useRef(demandeEcoute)
  const sceneRef = useRef(scene)
  const delai = useRef<number>(undefined)
  useEffect(() => {
    sceneRef.current = scene
  })

  const aller = useCallback((id: string) => setChemin((c) => [...c, id]), [])

  const finDeScene = useCallback(() => {
    const s = sceneRef.current
    if (s.suite) {
      const suite = s.suite
      delai.current = window.setTimeout(() => {
        if (enLectureRef.current) aller(suite)
      }, PAUSE_ENTRE_SCENES_MS)
    } else if (s.choix) {
      setChoixOuvert(true)
    } else {
      enLectureRef.current = false
      setEnLecture(false)
      setFini(true)
    }
  }, [aller])

  const texteVoix = useMemo(() => nettoyerPourVoix(scene.texteFr), [scene])

  // À chaque nouvelle scène : on repart de zéro, et on lit si la personne a demandé l'écoute.
  const { lire, arreter } = n
  useEffect(() => {
    setChoixOuvert(false)
    if (enLectureRef.current) void lire(texteVoix, finDeScene)
    else arreter()
    return () => {
      window.clearTimeout(delai.current)
      arreter()
    }
  }, [sceneId, essai, texteVoix, finDeScene, lire, arreter])

  const ecouter = () => {
    enLectureRef.current = true
    setEnLecture(true)
    if (n.etat === 'pause') n.reprendre()
    else void n.lire(texteVoix, finDeScene)
  }
  const mettreEnPause = () => {
    window.clearTimeout(delai.current)
    enLectureRef.current = false
    setEnLecture(false)
    n.pause()
  }
  const recommencer = () => {
    enLectureRef.current = true
    setEnLecture(true)
    setFini(false)
    setChemin([conte.scenes[0].id])
    setEssai((e) => e + 1)
  }
  const precedente = () => {
    setFini(false)
    setChemin((c) => (c.length > 1 ? c.slice(0, -1) : c))
  }
  const suivante = () => {
    if (scene.suite) aller(scene.suite)
    else if (scene.choix) setChoixOuvert(true)
    else setFini(true)
  }
  const choisir = (vers: string) => {
    setChoixOuvert(false)
    aller(vers)
  }

  // Barre d'espace : écouter ou mettre en pause (sauf quand le focus est sur un contrôle).
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (
        e.key !== ' ' ||
        (e.target as HTMLElement).closest('button,a,input,select,textarea')
      )
        return
      e.preventDefault()
      if (enLectureRef.current && !choixOuvert && !fini) mettreEnPause()
      else ecouter()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  })

  const texteAffiche = onglet === 'fr' ? scene.texteFr : scene.texteLangue
  const phrase = rangDePhrase(scene.texteFr, n.position)

  return (
    <div className="relative h-svh overflow-hidden bg-page">
      <PaysageAnime
        ambiance={ambiance}
        parle={n.etat === 'lecture'}
        impulsion={n.impulsion}
        phrase={phrase}
      />

      <Conteur
        ambiance={ambiance}
        parle={n.etat === 'lecture'}
        impulsion={n.impulsion}
        phrase={phrase}
      />

      <div className="verre absolute left-3 top-[4.75rem] z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4">
        <span
          className="chiffres grid size-8 place-items-center rounded-full font-display text-base font-extrabold text-sur-lang"
          style={{ background: couleurLangue(conte.langue) }}
        >
          {numeroDuConte(conte.id)}
        </span>
        <span className="truncate text-sm font-bold">{conte.titre.fr}</span>
        <span className="hidden text-sm font-semibold text-discret sm:inline">
          · {langue?.nom}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        Scène {chemin.length}
      </p>

      {choixOuvert && scene.choix && <Choix choix={scene.choix} onChoisir={choisir} />}
      {fini && <FinDeConte conte={conte} onRecommencer={recommencer} />}

      <section
        aria-label="Texte du conte"
        className="verre-dense absolute inset-x-3 bottom-3 z-10 mx-auto max-w-3xl rounded-3xl p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Langue du texte"
            className="flex rounded-full bg-surface p-1 ring-1 ring-ligne-forte"
          >
            {(
              [
                ['fr', 'Français'],
                ['langue', langue?.nom ?? 'Langue d’origine'],
              ] as const
            ).map(([id, libelle]) => (
              <button
                key={id}
                type="button"
                aria-pressed={onglet === id}
                onClick={() => setOnglet(id)}
                className={`h-9 rounded-full px-4 text-sm font-bold transition-colors duration-150 ${
                  onglet === id ? 'bg-texte text-page' : 'hover:bg-surface-2'
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>
          <p className="chiffres text-sm font-semibold text-discret">
            Scène {chemin.length}
          </p>
        </div>

        <div className="min-h-[7.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${sceneId}-${onglet}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <TexteSynchronise
                texte={texteAffiche}
                position={onglet === 'fr' ? n.position : -1}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4">
          <Commandes
            etat={n.etat}
            enLecture={enLecture}
            fini={fini}
            vitesse={n.vitesse}
            muet={n.muet}
            peutRevenir={chemin.length > 1}
            peutAvancer={!fini}
            onLire={ecouter}
            onPause={mettreEnPause}
            onPrecedente={precedente}
            onSuivante={suivante}
            onVitesse={n.setVitesse}
            onMuet={() => n.setMuet(!n.muet)}
          />
        </div>

        <p className="mt-3 text-xs font-medium text-discret">
          {n.moteur === 'minuterie' && n.etat !== 'arret'
            ? 'Aucune voix française disponible sur cet appareil : le texte défile en silence.'
            : 'Voix de synthèse provisoire : l’enregistrement du conteur la remplacera.'}
          {!conte.conteur.consentement && ' Contenu provisoire.'}
        </p>
      </section>
    </div>
  )
}
