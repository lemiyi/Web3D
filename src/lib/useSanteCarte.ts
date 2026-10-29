import { useCallback, useEffect, useRef, useState } from 'react'

// Une tuile qui échoue de temps en temps est normale (réseau lent, service occupé) : MapLibre continue sans elle.
// On ne prévient la personne que lorsqu'une source ne répond plus du tout, et on dit laquelle.
export type Probleme = {
  genre: 'maquette' | 'satellite' | 'relief' | 'general'
  detail: string
} | null

type Compte = { echecs: number; succes: number }

const NOMS: Record<string, string> = {
  satellite: 'images satellite (EOX)',
  nuit: 'lumières de nuit (NASA)',
  relief: 'relief (Terrarium)',
  rivieres: 'cours d’eau',
  'plans-eau': 'plans d’eau',
  courbes: 'courbes de niveau',
  voisins: 'pays voisins',
  vegetation: 'végétation',
}

// Combien d'échecs, sans réussite pour les compenser, avant de considérer qu'une source est hors service.
const SEUIL_TUILES = 6
const SEUIL_NUIT = 2
const RESEAU = /fetch|network|AJAX|erreur \d{3}|timeout|load/i

type EvenementErreur = {
  error?: { message?: string; status?: number }
  sourceId?: string
}
type EvenementDonnees = { sourceId?: string; tile?: unknown; isSourceLoaded?: boolean }

export function useSanteCarte({
  onSatelliteHorsService,
}: {
  onSatelliteHorsService: () => void
}) {
  const [probleme, setProbleme] = useState<Probleme>(null)
  const [nuitIndisponible, setNuitIndisponible] = useState(false)
  const comptes = useRef(new Map<string, Compte>())
  const rappel = useRef(onSatelliteHorsService)
  useEffect(() => {
    rappel.current = onSatelliteHorsService
  })

  const compte = (id: string) => {
    let c = comptes.current.get(id)
    if (!c) comptes.current.set(id, (c = { echecs: 0, succes: 0 }))
    return c
  }

  const surErreur = useCallback((e: EvenementErreur) => {
    const id = e.sourceId ?? ''
    const raison = e.error?.status
      ? `erreur ${e.error.status}`
      : (e.error?.message ?? 'erreur')
    const detail = `${NOMS[id] ?? 'carte'} : ${raison}`.slice(0, 160)
    if (!id) {
      // Sans source, seule une panne réseau (style, fichier) mérite un message ; le reste est une erreur de code.
      if (RESEAU.test(raison)) setProbleme({ genre: 'general', detail })
      else console.warn('Carte :', raison)
      return
    }
    const c = compte(id)
    c.echecs++
    const horsService = (seuil: number) => c.echecs >= seuil && c.echecs > c.succes
    if (id === 'nuit') {
      if (horsService(SEUIL_NUIT)) setNuitIndisponible(true)
    } else if (id === 'satellite') {
      if (horsService(SEUIL_TUILES)) {
        setProbleme({ genre: 'satellite', detail })
        rappel.current()
      }
    } else if (id === 'relief') {
      if (horsService(SEUIL_TUILES)) setProbleme({ genre: 'relief', detail })
    } else {
      // Un fichier de données entier qui manque : cela se voit, on le dit.
      setProbleme({ genre: 'general', detail })
    }
  }, [])

  const surDonnees = useCallback((e: EvenementDonnees) => {
    if (e.sourceId && e.tile) compte(e.sourceId).succes++
  }, [])

  // La maquette 3D signale elle-même ses échecs (WebGL absent, fichiers manquants).
  const signaler = useCallback((p: NonNullable<Probleme>) => setProbleme(p), [])

  // « Réessayer » : on repart de zéro, la carte redemandera ce qui manque.
  const effacer = useCallback(() => {
    comptes.current.clear()
    setProbleme(null)
    setNuitIndisponible(false)
  }, [])

  return { probleme, nuitIndisponible, surErreur, surDonnees, effacer, signaler }
}
