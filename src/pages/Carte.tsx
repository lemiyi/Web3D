import { useReducedMotion } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import ApercuConte from '@/components/map/ApercuConte'
import CalquesPanel from '@/components/map/CalquesPanel'
import FiltresPanel from '@/components/map/FiltresPanel'
import LectureAltitude, {
  type LectureAltitudeRef,
} from '@/components/map/LectureAltitude'
import Survol from '@/components/map/Survol'
import BarreChiffres from '@/components/ui/BarreChiffres'
import { CALQUES_DEFAUT, type Calques, type Fond } from '@/lib/calques'
import { contes } from '@/lib/contenu'
import { filtrerContes } from '@/lib/filtres'
import type { Lumiere } from '@/lib/lumiere'
import type { Marges, Pilote } from '@/lib/pilote'
import { useTheme } from '@/lib/theme'
import { type Probleme, useSanteCarte } from '@/lib/useSanteCarte'
import { useSurvol } from '@/lib/useSurvol'
import { useAppStore } from '@/store/useAppStore'

// Chaque vue n'est chargée que si on l'affiche : la maquette 3D (Three.js) ou la carte (MapLibre).
const VueMaquette = lazy(() => import('@/components/map/VueMaquette'))
const VueCarte = lazy(() => import('@/components/map/VueCarte'))

const estLarge = () => window.matchMedia('(min-width: 1024px)').matches

const marges = (): Marges =>
  estLarge()
    ? { top: 90, bottom: 90, left: 360, right: 30 }
    : { top: 110, bottom: 30, left: 10, right: 10 }

const segment = (actif: boolean) =>
  `h-10 rounded-full px-5 text-base font-bold transition-colors duration-150 ${
    actif ? 'bg-texte text-page' : 'hover:bg-surface-2'
  }`

export default function Carte() {
  const { conteSelectionne, selectionner, filtres, reinitialiserFiltres } = useAppStore()
  const theme = useTheme()
  // La maquette s'ouvre inclinée : c'est sa raison d'être.
  const [vue3d, setVue3d] = useState(true)
  const [pret, setPret] = useState(false)
  // La vue (et ses centaines de kilo-octets de 3D) ne démarre qu'après la première image :
  // l'interface s'affiche d'abord, la maquette ou la carte arrive ensuite.
  const [demarree, setDemarree] = useState(false)
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setDemarree(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])
  const reduit = useReducedMotion() ?? false
  const [fond, setFond] = useState<Fond>('maquette')
  const maquette = fond === 'maquette'
  // la vue affichée (carte ou maquette) : le survol et les boutons passent par elle
  const pilote = useRef<Pilote | null>(null)
  // inclinaison de la vue 3D : la maquette se regarde plus de biais
  const pitch3d = () => (maquette ? 45 : estLarge() ? 50 : 40)
  const [calques, setCalques] = useState<Calques>(CALQUES_DEFAUT)
  // L'heure : choisie par la personne, sinon celle du thème (le thème « veillée » donne la nuit).
  // Pendant le survol, c'est le parcours qui la règle.
  const [choixLumiere, setChoixLumiere] = useState<Lumiere | null>(null)
  const [lumiereSurvol, setLumiereSurvol] = useState<Lumiere | null>(null)
  const lumiere: Lumiere =
    lumiereSurvol ?? choixLumiere ?? (theme === 'dark' ? 'nuit' : 'jour')
  const lecture = useRef<LectureAltitudeRef>(null)
  // Si les images satellite ne répondent plus, la carte passe d'elle-même au relief illustré.
  const sante = useSanteCarte({ onSatelliteHorsService: () => setFond('carte') })

  const visibles = useMemo(() => filtrerContes(contes, filtres), [filtres])
  const conte = visibles.find((c) => c.id === conteSelectionne)

  // Un filtre peut écarter le conte ouvert : on ferme alors l'aperçu.
  useEffect(() => {
    if (conteSelectionne && !conte) selectionner(null)
  }, [conte, conteSelectionne, selectionner])

  // Le conte choisi (ici ou depuis l'accueil) se centre dans la partie libre de la vue.
  useEffect(() => {
    const p = pilote.current
    if (!pret || !conte || !p) return
    const padding = estLarge()
      ? { top: 40, bottom: 40, left: 340, right: 400 }
      : { top: 100, bottom: Math.round(window.innerHeight * 0.55), left: 20, right: 20 }
    p.voler(
      { centre: conte.coordonnees, zoom: Math.max(p.zoom(), 7) },
      { duree: 1100, marges: padding },
    )
  }, [pret, conte])

  // Passer de la maquette à une carte (ou l'inverse) change de vue : on repart d'un cadrage neuf.
  const changerFond = (suivant: Fond) => {
    if ((suivant === 'maquette') !== maquette) {
      pilote.current = null
      setPret(false)
      setVue3d(suivant === 'maquette')
    }
    setFond(suivant)
  }

  // On recadre en même temps qu'on incline : le pays garde la même largeur à l'écran.
  const basculerRelief = () => {
    const suivant = !vue3d
    setVue3d(suivant)
    pilote.current?.cadrer(suivant ? pitch3d() : 0, 900, marges())
  }

  const recentrer = () => {
    setVue3d(maquette)
    selectionner(null)
    pilote.current?.cadrer(maquette ? pitch3d() : 0, 1000, marges())
  }

  const visite = useSurvol(pilote, {
    reduit,
    onDebut: () => {
      selectionner(null)
      setVue3d(true)
    },
    onEtape: (etape) => setLumiereSurvol(etape.lumiere),
    onFin: () => {
      setLumiereSurvol(null)
      setVue3d(maquette)
      pilote.current?.cadrer(maquette ? pitch3d() : 0, 1400, marges())
    },
  })

  return (
    <div
      className={`relative h-svh overflow-hidden bg-page ${fond === 'satellite' ? 'fond-satellite' : ''}`}
    >
      {!demarree ? null : maquette ? (
        <Suspense fallback={null}>
          <VueMaquette
            lumiere={lumiere}
            calques={calques}
            contes={visibles}
            selection={conteSelectionne}
            onSelection={selectionner}
            reduit={reduit}
            pilote={pilote}
            onPret={() => {
              pilote.current?.cadrer(pitch3d(), 0, marges())
              setPret(true)
            }}
            onErreur={(detail) => {
              sante.signaler({ genre: 'maquette', detail })
              changerFond('satellite')
            }}
            onViser={(v) => lecture.current?.afficher(v.lon, v.lat)}
          />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <VueCarte
            fond={fond}
            lumiere={lumiere}
            calques={calques}
            vue3d={vue3d}
            contes={visibles}
            ouvert={conte}
            selection={conteSelectionne}
            onSelection={selectionner}
            reduit={reduit}
            nuitDisponible={!sante.nuitIndisponible}
            pilote={pilote}
            marges={marges}
            onPret={() => setPret(true)}
            onViser={(lon, lat) => lecture.current?.afficher(lon, lat)}
            onErreur={sante.surErreur}
            onDonnees={sante.surDonnees}
          />
        </Suspense>
      )}

      {!visite.actif && <FiltresPanel visibles={visibles.length} />}

      <div
        className={`absolute right-3 top-[4.75rem] z-10 flex-col items-end gap-2 ${visite.actif ? 'hidden' : 'flex'}`}
      >
        <div
          role="group"
          aria-label="Type de vue"
          className="flottant flex rounded-full bg-surface p-1 ring-1 ring-ligne-forte"
        >
          <button
            type="button"
            aria-pressed={!vue3d}
            onClick={vue3d ? basculerRelief : undefined}
            className={segment(!vue3d)}
          >
            2D
          </button>
          <button
            type="button"
            aria-pressed={vue3d}
            onClick={vue3d ? undefined : basculerRelief}
            className={segment(vue3d)}
          >
            3D
          </button>
        </div>
        <CalquesPanel
          fond={fond}
          onFond={changerFond}
          lumiere={lumiere}
          onLumiere={setChoixLumiere}
          calques={calques}
          onChange={setCalques}
        />
        <button
          type="button"
          onClick={visite.demarrer}
          disabled={!pret || visite.etapes.length === 0}
          className="flottant flex h-10 items-center gap-2 rounded-full bg-texte px-5 text-base font-bold text-page transition-opacity duration-150 disabled:opacity-50"
        >
          <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
            <path d="M1 1.2v11.6L11 7z" fill="currentColor" />
          </svg>
          Survoler
        </button>
        <button
          type="button"
          onClick={recentrer}
          className={`flottant bg-surface ring-1 ring-ligne-forte ${segment(false)}`}
        >
          Recentrer
        </button>
      </div>

      {visite.actif && (
        <Survol
          etapes={visite.etapes}
          indice={visite.indice}
          enPause={visite.enPause}
          altitude={visite.altitude}
          onPause={visite.basculerPause}
          onSuivant={visite.suivant}
          onArreter={visite.arreter}
          lumiere={lumiere}
        />
      )}

      {/* La licence de l'imagerie demande un crédit visible tant que la photo (ou la maquette qui en est tirée) est affichée. */}
      {fond !== 'carte' && (
        <p
          className="pointer-events-none absolute bottom-1 left-11 z-10 max-w-[calc(100%-6rem)] truncate text-[0.68rem] font-semibold leading-none text-[var(--etiquette)]"
          style={{ textShadow: '0 0 3px var(--etiquette-halo)' }}
        >
          Images : EOxCloudless 2024 (EOX), données Copernicus Sentinel modifiées
          {maquette
            ? ' · Relief : SRTM (Terrarium) · Sol : ESA WorldCover 2021'
            : lumiere === 'nuit' && ' · Lumières : NASA Black Marble'}
        </p>
      )}

      <LectureAltitude
        ref={lecture}
        className={`absolute bottom-4 left-1/2 z-10 max-w-[calc(100%-9rem)] -translate-x-1/2 lg:bottom-28 lg:max-w-none ${visite.actif ? 'hidden' : ''}`}
      />

      <BarreChiffres
        contes={visibles}
        className={`absolute bottom-6 left-1/2 z-10 -translate-x-1/2 ${visite.actif ? 'hidden' : 'hidden lg:flex'}`}
      />

      {!pret && sante.probleme?.genre !== 'general' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p
            role="status"
            className="verre-dense flottant rounded-full px-5 py-2.5 text-base font-bold"
          >
            {maquette ? 'Chargement de la maquette…' : 'Chargement du relief…'}
          </p>
        </div>
      )}

      {sante.probleme && (
        <AlerteCarte
          probleme={sante.probleme}
          onFermer={sante.effacer}
          onReessayer={() => {
            sante.effacer()
            if (sante.probleme?.genre === 'satellite') setFond('satellite')
            else if (sante.probleme?.genre === 'maquette') changerFond('maquette')
            else window.location.reload()
          }}
        />
      )}

      {pret && visibles.length === 0 && (
        <div
          role="status"
          className="verre-dense absolute inset-x-3 top-1/2 z-10 mx-auto max-w-sm -translate-y-1/2 rounded-3xl p-5 text-center"
        >
          <p className="font-display text-2xl font-extrabold tracking-tight">
            Aucun conte ne correspond
          </p>
          <p className="mt-1 text-base text-discret">
            Essayez une autre langue, un autre type ou une autre région.
          </p>
          <button
            type="button"
            onClick={reinitialiserFiltres}
            className="mt-4 h-11 rounded-full bg-texte px-6 text-base font-bold text-page"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {conte && <ApercuConte conte={conte} onFermer={() => selectionner(null)} />}
    </div>
  )
}

const MESSAGES: Record<
  NonNullable<Probleme>['genre'],
  { texte: string; action: string }
> = {
  maquette: {
    texte:
      'La maquette 3D n’a pas pu s’afficher sur cet appareil : la carte satellite prend le relais.',
    action: 'Réessayer la maquette',
  },
  satellite: {
    texte:
      'Les images satellite ne répondent pas pour l’instant : la carte est passée en relief illustré.',
    action: 'Réessayer le satellite',
  },
  relief: {
    texte:
      'Le relief ne se charge pas : l’ombrage et la vue 3D sont indisponibles pour l’instant.',
    action: 'Recharger la page',
  },
  general: {
    texte: 'Une partie de la carte n’a pas pu se charger. Vérifiez votre connexion.',
    action: 'Recharger la page',
  },
}

// Le message dit ce qui manque et propose de réessayer ; le détail technique aide à signaler le problème.
function AlerteCarte({
  probleme,
  onFermer,
  onReessayer,
}: {
  probleme: NonNullable<Probleme>
  onFermer: () => void
  onReessayer: () => void
}) {
  const { texte, action } = MESSAGES[probleme.genre]
  return (
    <div
      role="status"
      className="verre-dense flottant absolute inset-x-3 bottom-16 z-20 mx-auto max-w-md rounded-3xl p-4 lg:bottom-24"
    >
      <p className="text-base font-semibold leading-snug">{texte}</p>
      <details className="mt-1 text-sm text-discret">
        <summary className="cursor-pointer">Détails techniques</summary>
        <p className="mt-1 break-words">{probleme.detail}</p>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReessayer}
          className="h-11 rounded-full bg-texte px-5 text-base font-bold text-page"
        >
          {action}
        </button>
        <button
          type="button"
          onClick={onFermer}
          className="h-11 rounded-full px-5 text-base font-bold ring-1 ring-ligne-forte hover:bg-surface-2"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
