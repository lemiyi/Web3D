import {
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import nature from '@/content/geo/nature.json'
import { sites } from '@/content/geo/sites.json'
import type { Calques } from '@/lib/calques'
import { regions } from '@/lib/contenu'
import { largeurTexte } from '@/lib/etiquettes'
import type { Lumiere } from '@/lib/lumiere'
import { VILLES } from '@/lib/maquette/objets'
import { SceneMaquette, type Visee } from '@/lib/maquette/scene'
import type { Pilote } from '@/lib/pilote'
import type { Conte } from '@/lib/schemas'
import Repere from './Repere'

type Props = {
  lumiere: Lumiere
  calques: Calques
  contes: Conte[]
  selection: string | null
  onSelection: (id: string) => void
  reduit: boolean
  pilote: RefObject<Pilote | null>
  onPret: () => void
  onErreur: (detail: string) => void
  onViser: (visee: Visee) => void
}

type Genre = 'region' | 'ville' | 'pays' | 'site' | 'sommet' | 'lac'
type Etiquette = {
  cle: string
  texte: string
  centre: [number, number]
  genre: Genre
  // zooms entre lesquels le nom s'affiche, et décalage vertical en pixels
  zoom: [number, number]
  dy: number
  calque?: keyof Calques
}

const nomLac = (nom: string) =>
  nom.replace(/^(Barrage|Lac du Barrage|Mare) (de |du |d')?/i, '')

// Par ordre de priorité : un nom n'est posé que s'il ne recouvre ni un nom plus important, ni un repère de conte.
const ETIQUETTES: Etiquette[] = [
  ...regions.map((r) => ({
    cle: `r-${r.id}`,
    texte: r.nom,
    centre: r.centre as [number, number],
    genre: 'region' as const,
    zoom: [5, 7.4] as [number, number],
    dy: 26,
  })),
  ...VILLES.map((v) => ({
    cle: `v-${v.nom}`,
    texte: v.nom,
    centre: v.centre,
    genre: 'ville' as const,
    zoom: [v.poids > 0.5 ? 6.2 : 7, 99] as [number, number],
    dy: -14,
    calque: 'villes' as const,
  })),
  ...sites.map((s) => ({
    cle: `s-${s.id}`,
    texte: s.nom,
    centre: s.centre as [number, number],
    genre: 'site' as const,
    zoom: [7.8, 99] as [number, number],
    dy: 0,
  })),
  ...nature.sommets
    .filter((s) => !s.voisin)
    .slice(0, 8)
    .map((s, i) => ({
      cle: `m-${s.nom}`,
      texte: `${s.nom} ${s.alt} m`,
      centre: s.centre as [number, number],
      genre: 'sommet' as const,
      zoom: [i < 3 ? 6.4 : 7.6, 99] as [number, number],
      dy: -12,
      calque: 'sommets' as const,
    })),
  ...nature.plansEau.slice(0, 6).map((e) => ({
    cle: `l-${e.nom}`,
    texte: nomLac(e.nom),
    centre: e.centre as [number, number],
    genre: 'lac' as const,
    zoom: [6.8, 99] as [number, number],
    dy: 0,
    calque: 'eau' as const,
  })),
  ...nature.pays.map((p) => ({
    cle: `p-${p.nom}`,
    texte: p.nom,
    centre: p.centre as [number, number],
    genre: 'pays' as const,
    zoom: [5, 7.2] as [number, number],
    dy: 0,
  })),
]

const STYLES: Record<Genre, { classe: string; taille: number }> = {
  region: {
    classe:
      'font-display text-[0.95rem] font-bold leading-[0.95] tracking-tight text-[var(--etiquette)]',
    taille: 15,
  },
  ville: {
    classe: 'font-display text-sm font-extrabold tracking-tight text-[var(--etiquette)]',
    taille: 14,
  },
  pays: {
    classe:
      'font-display text-[0.7rem] font-extrabold uppercase tracking-[0.32em] text-[var(--etiquette-discret)]',
    taille: 12,
  },
  site: {
    classe: 'font-serif text-[0.8rem] italic text-[var(--etiquette)]',
    taille: 13,
  },
  sommet: {
    classe: 'font-serif text-[0.78rem] italic text-[var(--etiquette)]',
    taille: 12.5,
  },
  lac: {
    classe: 'font-serif text-[0.8rem] italic text-[var(--etiquette-eau)]',
    taille: 13,
  },
}

const halo = {
  WebkitTextStroke: '4px var(--etiquette-halo)',
  paintOrder: 'stroke',
} as const

// Un repère de conte : la pastille numérotée sur une tige plantée dans la maquette.
const REPERE = { l: 44, h: 60 }

// La maquette 3D (Three.js) et ce qui s'y pose en HTML : repères des contes et noms de lieux.
// Les repères suivent la caméra image par image, sans repasser par React.
export default function VueMaquette({
  lumiere,
  calques,
  contes,
  selection,
  onSelection,
  reduit,
  pilote,
  onPret,
  onErreur,
  onViser,
}: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const scene = useRef<SceneMaquette | null>(null)
  const reperes = useRef(new Map<string, HTMLDivElement>())
  const noms = useRef(new Map<string, HTMLSpanElement>())
  const [pret, setPret] = useState(false)
  // les rappels et réglages du moment, lus par la scène sans la recréer
  const actuel = useRef({ lumiere, calques, contes, onPret, onErreur, onViser })
  useEffect(() => {
    actuel.current = { lumiere, calques, contes, onPret, onErreur, onViser }
  })

  useEffect(() => {
    const el = conteneur.current
    if (!el) return
    let detruite = false
    let s: SceneMaquette
    try {
      const leger =
        window.matchMedia('(max-width: 767px)').matches ||
        (navigator.hardwareConcurrency ?? 8) <= 4
      s = new SceneMaquette(el, {
        leger,
        reduit,
        onPerte: () => actuel.current.onErreur('contexte WebGL perdu'),
      })
    } catch (e) {
      actuel.current.onErreur(`WebGL indisponible (${(e as Error).message})`)
      return
    }
    s.charger(actuel.current.lumiere)
      .then(() => {
        if (detruite) return
        scene.current = s
        pilote.current = s.pilote()
        // Réservé au développement (retiré du build) : permet aux mesures automatisées d'interroger la scène.
        if (import.meta.env.DEV) Object.assign(window, { __maquette: s })
        s.definirCalques(actuel.current.calques)
        setPret(true)
        actuel.current.onPret()
      })
      .catch((e: Error) => {
        if (!detruite) actuel.current.onErreur(e.message)
      })
    return () => {
      detruite = true
      if (scene.current === s) pilote.current = null
      scene.current = null
      s.detruire()
    }
    // la scène est créée une seule fois ; ses réglages suivent par les effets ci-dessous
  }, [pilote, reduit])

  useEffect(() => {
    if (pret) scene.current?.definirLumiere(lumiere)
  }, [pret, lumiere])

  useEffect(() => {
    if (pret) scene.current?.definirCalques(calques)
  }, [pret, calques])

  // Placement des repères et des noms à chaque image.
  useEffect(() => {
    const s = scene.current
    if (!pret || !s) return
    const placer = () => {
      const { l, h } = {
        l: conteneur.current?.clientWidth ?? 0,
        h: conteneur.current?.clientHeight ?? 0,
      }
      const occupees: { x: number; y: number; l: number; h: number }[] = []
      const visible = (x: number, y: number, m = 40) =>
        x > -m && y > -m && x < l + m && y < h + m
      for (const c of actuel.current.contes) {
        const el = reperes.current.get(c.id)
        if (!el) continue
        const p = s.projeter(c.coordonnees[0], c.coordonnees[1])
        if (!p.devant || !visible(p.x, p.y)) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.transform = `translate(${Math.round(p.x - REPERE.l / 2)}px, ${Math.round(p.y - REPERE.h)}px)`
        el.style.zIndex = String(Math.round(p.y))
        occupees.push({ x: p.x, y: p.y - REPERE.h + 22, l: REPERE.l, h: REPERE.l })
      }
      const { zoom } = s.vueActuelle()
      const { calques: c } = actuel.current
      for (const e of ETIQUETTES) {
        const el = noms.current.get(e.cle)
        if (!el) continue
        const montre = zoom >= e.zoom[0] && zoom < e.zoom[1] && (!e.calque || c[e.calque])
        const p = montre ? s.projeter(e.centre[0], e.centre[1]) : null
        const boite = p && {
          x: p.x,
          y: p.y + e.dy,
          l: largeurTexte(e.texte, STYLES[e.genre].taille) + 8,
          h: STYLES[e.genre].taille + 8,
        }
        const libre =
          boite &&
          p.devant &&
          visible(boite.x, boite.y, 0) &&
          !occupees.some(
            (o) =>
              Math.abs(o.x - boite.x) < (o.l + boite.l) / 2 &&
              Math.abs(o.y - boite.y) < (o.h + boite.h) / 2,
          )
        if (!libre) {
          el.style.visibility = 'hidden'
          continue
        }
        occupees.push(boite)
        el.style.visibility = 'visible'
        el.style.transform = `translate(${Math.round(boite.x)}px, ${Math.round(boite.y)}px) translate(-50%, -50%)`
      }
    }
    placer()
    return s.surRendu(placer)
  }, [pret, contes, calques])

  // Survol : la région sous le pointeur s'éclaire, l'altitude du point s'affiche.
  const attente = useRef(0)
  const surMouvement = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || attente.current) return
    const { clientX, clientY } = e
    attente.current = requestAnimationFrame(() => {
      attente.current = 0
      const s = scene.current
      if (!s || s.enVol()) return
      const v = s.viser(clientX, clientY)
      s.definirRegionSurvolee(v?.region ?? 0)
      if (v) actuel.current.onViser(v)
    })
  }
  const surClic = (e: MouseEvent) => {
    const v = scene.current?.viser(e.clientX, e.clientY)
    if (v) actuel.current.onViser(v)
  }

  const nuit = lumiere === 'nuit'
  const etiquettes = useMemo(
    () =>
      ETIQUETTES.map((e) => (
        <span
          key={e.cle}
          ref={(el) => {
            if (el) noms.current.set(e.cle, el)
            else noms.current.delete(e.cle)
          }}
          className={`pointer-events-none absolute left-0 top-0 whitespace-nowrap ${STYLES[e.genre].classe}`}
          style={{ ...halo, visibility: 'hidden' }}
        >
          {e.genre === 'ville' && (
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-1.5 rounded-full bg-[var(--etiquette)] align-middle"
            />
          )}
          {e.texte}
        </span>
      )),
    [],
  )

  return (
    <div
      ref={conteneur}
      className={`absolute inset-0 ${nuit ? 'fond-satellite' : ''}`}
      onPointerMove={surMouvement}
      onPointerLeave={() => scene.current?.definirRegionSurvolee(0)}
      onClick={surClic}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      >
        {etiquettes}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        {contes.map((c) => (
          <div
            key={c.id}
            ref={(el) => {
              if (el) reperes.current.set(c.id, el)
              else reperes.current.delete(c.id)
            }}
            className="absolute left-0 top-0 flex w-11 flex-col items-center"
            style={{ visibility: 'hidden' }}
          >
            <span className="pointer-events-auto">
              <Repere
                conte={c}
                actif={c.id === selection}
                onClick={() => onSelection(c.id)}
              />
            </span>
            <span
              aria-hidden="true"
              className="-mt-1.5 h-3 w-0.5 rounded-full bg-[var(--etiquette)]"
              style={{ boxShadow: '0 0 0 1px var(--etiquette-halo)' }}
            />
            <span
              aria-hidden="true"
              className="h-1 w-3 rounded-[50%] bg-[var(--etiquette)] opacity-50"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
