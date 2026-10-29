import { describe, expect, it } from 'vitest'
import {
  DOMAINE,
  EMPRISE_BLOC,
  SOCLE,
  TAILLES,
  decoderAltitude,
  hauteurBloc,
  hauteurVoisins,
  versLonLat,
  versScene,
  versUv,
} from './domaine'

describe('domaine de la maquette', () => {
  it('passe de lon/lat à la scène et retour sans perte', () => {
    for (const [lon, lat] of [
      [-1.5197, 12.3714],
      [-5.42, 10.76],
      [2.3, 14.9],
    ]) {
      const [x, z] = versScene(lon, lat)
      const [lon2, lat2] = versLonLat(x, z)
      expect(lon2).toBeCloseTo(lon, 9)
      expect(lat2).toBeCloseTo(lat, 9)
    }
  })

  it('oriente la scène : est vers +x, nord vers -z', () => {
    const [x0, z0] = versScene(-1.5, 12)
    const [x1] = versScene(-0.5, 12)
    const [, z1] = versScene(-1.5, 13)
    expect(x1).toBeGreaterThan(x0)
    expect(z1).toBeLessThan(z0)
  })

  it('place les coins du domaine aux coins des textures', () => {
    expect(versUv(DOMAINE.w, DOMAINE.s)).toEqual([0, 0])
    expect(versUv(DOMAINE.e, DOMAINE.n)).toEqual([1, 1])
  })

  it('garde le bloc entier dans le domaine', () => {
    expect(EMPRISE_BLOC.w).toBeGreaterThan(DOMAINE.w)
    expect(EMPRISE_BLOC.e).toBeLessThan(DOMAINE.e)
    expect(EMPRISE_BLOC.s).toBeGreaterThan(DOMAINE.s)
    expect(EMPRISE_BLOC.n).toBeLessThan(DOMAINE.n)
  })

  it('pose le Burkina au-dessus de ses voisins, même au plus bas', () => {
    expect(hauteurBloc(150)).toBeGreaterThan(hauteurVoisins(900))
    expect(hauteurBloc(250)).toBe(SOCLE)
  })

  it('décode l’altitude codée sur deux octets', () => {
    expect(decoderAltitude(1, 94)).toBe(250)
  })

  it('produit des images aux pixels à peu près carrés sur le terrain', () => {
    for (const [l, h] of Object.values(TAILLES)) {
      const [x0, z0] = versScene(DOMAINE.w, DOMAINE.n)
      const [x1, z1] = versScene(DOMAINE.e, DOMAINE.s)
      expect((x1 - x0) / l / ((z1 - z0) / h)).toBeCloseTo(1, 1)
    }
  })
})
