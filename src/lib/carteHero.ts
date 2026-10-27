import { useEffect, useState } from 'react'

export type CarteHero = {
  viewBox: [number, number, number, number]
  pays: string
  regions: {
    id: string
    nom: string
    bbox: [number, number, number, number]
    d: string
  }[]
  rivieres: { nom: string; d: string }[]
  seuils: number[]
  bandes: { min: number; d: string }[]
}

// Les tracés (≈240 Ko) sont chargés à part : le cadre, la grille et les repères s'affichent tout de suite.
export function useCarteHero() {
  const [carte, setCarte] = useState<CarteHero | null>(null)
  useEffect(() => {
    let actif = true
    import('@/content/geo/hero-map.json').then((m) => {
      if (actif) setCarte(m.default as unknown as CarteHero)
    })
    return () => {
      actif = false
    }
  }, [])
  return carte
}
