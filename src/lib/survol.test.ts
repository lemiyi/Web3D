import { describe, expect, it } from 'vitest'
import { creerEtapes } from './survol'

describe('parcours du survol', () => {
  const etapes = creerEtapes()

  it('commence par une vue d’ensemble puis visite des lieux de la carte', () => {
    expect(etapes.length).toBeGreaterThanOrEqual(5)
    expect(etapes[0].nom).toMatch(/ciel/)
    expect(etapes[1].detail).toMatch(/Point culminant/)
  })

  it('va du plein jour à la nuit, et finit sur la dernière étape', () => {
    expect(etapes[0].lumiere).toBe('jour')
    expect(etapes.at(-1)?.lumiere).toBe('nuit')
    expect(etapes.at(-1)?.derniere).toBe(true)
    const ordre = { jour: 0, soir: 1, nuit: 2 }
    for (let i = 1; i < etapes.length; i++)
      expect(ordre[etapes[i].lumiere]).toBeGreaterThanOrEqual(
        ordre[etapes[i - 1].lumiere],
      )
  })

  it('reste dans la boîte du Burkina avec une caméra inclinée', () => {
    for (const e of etapes) {
      expect(e.centre[0]).toBeGreaterThan(-6)
      expect(e.centre[0]).toBeLessThan(3)
      expect(e.centre[1]).toBeGreaterThan(9)
      expect(e.centre[1]).toBeLessThan(15.5)
      expect(e.pitch).toBeGreaterThan(40)
      expect(e.pitch).toBeLessThanOrEqual(70)
    }
  })
})
