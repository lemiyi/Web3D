import { useCallback, useEffect, useRef, useState } from 'react'
import { motsDuTexte, type Mot } from './narration'

export type EtatNarration = 'arret' | 'lecture' | 'pause'
// voix : synthèse vocale du navigateur ; minuterie : lecture silencieuse au rythme d'une lecture à voix haute.
export type Moteur = 'voix' | 'minuterie'

const CARACTERES_PAR_SECONDE = 15
const PAS_MINUTERIE_MS = 80

const synthese = () => ('speechSynthesis' in window ? window.speechSynthesis : undefined)

const voixFrancaise = () =>
  synthese()
    ?.getVoices()
    .find((v) => v.lang.toLowerCase().startsWith('fr'))

// Les voix arrivent parfois après le premier appel : on attend un court instant, puis on bascule en silence.
function attendreVoix(): Promise<SpeechSynthesisVoice | undefined> {
  return new Promise((resolve) => {
    const s = synthese()
    if (!s) return resolve(undefined)
    const deja = voixFrancaise()
    if (deja) return resolve(deja)
    let fini = false
    const terminer = () => {
      if (fini) return
      fini = true
      clearTimeout(delai)
      s.removeEventListener('voiceschanged', surChangement)
      resolve(voixFrancaise())
    }
    const surChangement = () => voixFrancaise() && terminer()
    const delai = setTimeout(terminer, 800)
    s.addEventListener('voiceschanged', surChangement)
  })
}

export function useNarration() {
  const [etat, setEtat] = useState<EtatNarration>('arret')
  const [position, setPosition] = useState(-1) // -1 : lecture pas commencée
  const [impulsion, setImpulsion] = useState(0) // +1 à chaque nouveau mot lu
  const [moteur, setMoteur] = useState<Moteur | null>(null)
  const [vitesse, setVitesseEtat] = useState(1)
  const [muet, setMuetEtat] = useState(false)

  const r = useRef({
    texte: '',
    mots: [] as Mot[],
    onFin: undefined as (() => void) | undefined,
    jeton: 0, // invalide les lectures abandonnées
    minuteur: undefined as number | undefined,
    position: -1,
    dernierMot: -1,
    vitesse: 1,
    muet: false,
    etat: 'arret' as EtatNarration,
  })

  const definirEtat = (e: EtatNarration) => {
    r.current.etat = e
    setEtat(e)
  }

  const arreterMoteurs = useCallback(() => {
    r.current.jeton++
    window.clearInterval(r.current.minuteur)
    r.current.minuteur = undefined
    synthese()?.cancel()
  }, [])

  const placer = useCallback((p: number) => {
    r.current.position = p
    setPosition(p)
    const rang = r.current.mots.findLastIndex((m) => m.debut <= p)
    if (rang !== r.current.dernierMot) {
      r.current.dernierMot = rang
      setImpulsion((i) => i + 1)
    }
  }, [])

  const terminer = useCallback(() => {
    window.clearInterval(r.current.minuteur)
    r.current.minuteur = undefined
    setPosition(r.current.texte.length)
    r.current.position = r.current.texte.length
    definirEtat('arret')
    r.current.onFin?.()
  }, [])

  const minuterie = useCallback(
    (depart: number, avecFin: boolean) => {
      window.clearInterval(r.current.minuteur)
      let p = Math.max(depart, 0)
      placer(p)
      r.current.minuteur = window.setInterval(() => {
        p += CARACTERES_PAR_SECONDE * r.current.vitesse * (PAS_MINUTERIE_MS / 1000)
        if (p >= r.current.texte.length) {
          if (avecFin) terminer()
          else window.clearInterval(r.current.minuteur)
          return
        }
        placer(Math.floor(p))
      }, PAS_MINUTERIE_MS)
    },
    [placer, terminer],
  )

  const lire = useCallback(
    async (texte: string, onFin?: () => void, depart = 0) => {
      arreterMoteurs()
      const jeton = r.current.jeton
      Object.assign(r.current, { texte, onFin, mots: motsDuTexte(texte), dernierMot: -1 })
      definirEtat('lecture')
      placer(depart)

      const voix = r.current.muet ? undefined : await attendreVoix()
      if (jeton !== r.current.jeton) return

      if (!voix) {
        setMoteur('minuterie')
        minuterie(depart, true)
        return
      }

      setMoteur('voix')
      const u = new SpeechSynthesisUtterance(texte.slice(depart))
      u.voice = voix
      u.lang = voix.lang
      u.rate = r.current.vitesse
      let aDesReperes = false

      // Certains navigateurs ne donnent pas la position du mot : on suit alors le texte à la minuterie.
      u.onstart = () => {
        window.setTimeout(() => {
          if (jeton === r.current.jeton && !aDesReperes)
            minuterie(r.current.position, false)
        }, 900)
      }
      u.onboundary = (e) => {
        if (jeton !== r.current.jeton) return
        aDesReperes = true
        window.clearInterval(r.current.minuteur)
        placer(depart + e.charIndex)
      }
      u.onend = () => {
        if (jeton === r.current.jeton) terminer()
      }
      u.onerror = (e) => {
        if (
          jeton !== r.current.jeton ||
          e.error === 'canceled' ||
          e.error === 'interrupted'
        )
          return
        setMoteur('minuterie')
        minuterie(r.current.position, true)
      }
      synthese()?.speak(u)
    },
    [arreterMoteurs, minuterie, placer],
  )

  const debutDuMotCourant = () =>
    r.current.mots[Math.max(r.current.dernierMot, 0)]?.debut ?? 0

  const pause = useCallback(() => {
    if (r.current.etat !== 'lecture') return
    arreterMoteurs()
    definirEtat('pause')
  }, [arreterMoteurs])

  const reprendre = useCallback(() => {
    void lire(r.current.texte, r.current.onFin, debutDuMotCourant())
  }, [lire])

  const arreter = useCallback(() => {
    arreterMoteurs()
    definirEtat('arret')
    placer(-1)
  }, [arreterMoteurs, placer])

  // Changer la vitesse ou couper le son relance la lecture au mot en cours.
  const relancerSiBesoin = useCallback(() => {
    if (r.current.etat === 'lecture')
      void lire(r.current.texte, r.current.onFin, debutDuMotCourant())
  }, [lire])

  const setVitesse = useCallback(
    (v: number) => {
      r.current.vitesse = v
      setVitesseEtat(v)
      relancerSiBesoin()
    },
    [relancerSiBesoin],
  )

  const setMuet = useCallback(
    (m: boolean) => {
      r.current.muet = m
      setMuetEtat(m)
      relancerSiBesoin()
    },
    [relancerSiBesoin],
  )

  useEffect(() => arreterMoteurs, [arreterMoteurs])

  return {
    etat,
    position,
    impulsion,
    moteur,
    vitesse,
    muet,
    lire,
    pause,
    reprendre,
    arreter,
    setVitesse,
    setMuet,
  }
}
