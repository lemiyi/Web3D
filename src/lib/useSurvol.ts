import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { altitudeEn } from './altitude'
import type { Pilote } from './pilote'
import { creerEtapes, type Etape } from './survol'

type Options = {
  reduit: boolean
  onDebut: () => void
  onFin: () => void
  // appelé au début de chaque étape : la page y règle l'heure (jour, fin du jour, nuit)
  onEtape: (etape: Etape) => void
}

// Le survol guidé : la caméra enchaîne les lieux du parcours (voir survol.ts), du plein jour à la nuit.
// Il pilote la vue affichée, carte ou maquette. Toucher la vue, Échap ou « Arrêter » interrompt le vol.
export function useSurvol(pilote: RefObject<Pilote | null>, options: Options) {
  // Les rappels changent à chaque rendu : on les lit par une référence pour ne pas relancer le vol.
  const rappels = useRef(options)
  useEffect(() => {
    rappels.current = options
  })
  const { reduit } = options
  const etapes = useMemo(creerEtapes, [])
  const [indice, setIndice] = useState(-1)
  const [enPause, setEnPause] = useState(false)
  const [altitude, setAltitude] = useState<number | null>(null)
  const actif = indice >= 0

  const arreter = useCallback(() => {
    pilote.current?.arreter()
    setIndice(-1)
    setEnPause(false)
    setAltitude(null)
    rappels.current.onFin()
  }, [pilote])

  const demarrer = useCallback(() => {
    if (!etapes.length) return
    rappels.current.onDebut()
    setEnPause(false)
    setIndice(0)
  }, [etapes])

  const suivant = useCallback(() => {
    if (indice + 1 < etapes.length) setIndice(indice + 1)
    else arreter()
  }, [indice, etapes, arreter])

  // Une étape : on vole jusqu'au lieu, on y reste un moment, puis on passe à la suivante.
  useEffect(() => {
    if (!actif || enPause) return
    const p = pilote.current
    const etape = etapes[indice]
    if (!p || !etape) return
    let annule = false
    let minuterie: number | undefined

    setAltitude(null)
    void altitudeEn(etape.centre[0], etape.centre[1]).then((a) => {
      if (!annule) setAltitude(a)
    })
    rappels.current.onEtape(etape)

    const fin = () => {
      // La dernière étape reste à l'écran : c'est la personne qui choisit d'aller vers les contes.
      if (annule || etape.derniere) return
      minuterie = window.setTimeout(() => {
        if (!annule) suivant()
      }, etape.pause)
    }
    p.voler(
      {
        centre: etape.centre,
        zoom: etape.zoom,
        pitch: etape.pitch,
        bearing: etape.bearing,
      },
      {
        duree: reduit ? 0 : etape.duree,
        marges: {
          top: 0,
          left: 0,
          right: 0,
          bottom: window.innerWidth >= 1024 ? 150 : 210,
        },
      },
      fin,
    )

    return () => {
      annule = true
      window.clearTimeout(minuterie)
    }
  }, [actif, enPause, indice, etapes, pilote, suivant, reduit])

  // Toucher la vue reprend la main ; Échap aussi.
  useEffect(() => {
    if (!actif) return
    const surface = pilote.current?.surface()
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && arreter()
    const evenements = ['pointerdown', 'wheel', 'touchstart'] as const
    for (const nom of evenements)
      surface?.addEventListener(nom, arreter, { passive: true })
    document.addEventListener('keydown', surTouche)
    return () => {
      for (const nom of evenements) surface?.removeEventListener(nom, arreter)
      document.removeEventListener('keydown', surTouche)
    }
  }, [actif, pilote, arreter])

  const basculerPause = useCallback(() => {
    setEnPause((p) => {
      if (!p) pilote.current?.arreter()
      return !p
    })
  }, [pilote])

  return {
    etapes,
    indice,
    actif,
    enPause,
    altitude,
    demarrer,
    arreter,
    suivant,
    basculerPause,
  }
}
