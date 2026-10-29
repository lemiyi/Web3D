import { describe, expect, it } from 'vitest'
import { placer, seChevauchent } from './etiquettes'

const boite = (lon: number, lat: number) => ({ lon, lat, l: 100, h: 16 })

describe('placement des étiquettes', () => {
  it('détecte deux noms qui se recouvrent, et pas deux noms éloignés', () => {
    expect(seChevauchent(boite(0, 12), boite(0.1, 12), 7)).toBe(true)
    expect(seChevauchent(boite(0, 12), boite(3, 12), 7)).toBe(false)
  })

  it('plus on zoome, plus les noms voisins tiennent ensemble', () => {
    expect(seChevauchent(boite(0, 12), boite(0.5, 12), 5)).toBe(true)
    expect(seChevauchent(boite(0, 12), boite(0.5, 12), 8)).toBe(false)
  })

  it('garde le plus prioritaire et écarte ce qui le recouvre', () => {
    const premier = boite(0, 12)
    const gene = boite(0.05, 12)
    const libre = boite(4, 12)
    expect(placer([], [premier, gene, libre], 7)).toEqual([premier, libre])
  })

  it('respecte les éléments fixes, comme un repère de conte', () => {
    const repere = { lon: 0, lat: 12, l: 34, h: 34 }
    expect(placer([repere], [boite(0.02, 12)], 7)).toEqual([])
  })
})
