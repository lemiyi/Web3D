import { describe, expect, it } from 'vitest'
import { contes } from './contenu'
import { filtrerContes, filtresActifs, type Filtres } from './filtres'

const vide: Filtres = { langue: null, region: null, type: null, recherche: '' }

describe('filtrerContes', () => {
  it('renvoie tout sans filtre', () => {
    expect(filtrerContes(contes, vide)).toHaveLength(contes.length)
  })

  it('filtre par langue', () => {
    const resultat = filtrerContes(contes, { ...vide, langue: 'dioula' })
    expect(resultat.length).toBeGreaterThan(0)
    expect(resultat.every((c) => c.langue === 'dioula')).toBe(true)
  })

  it('combine langue et type', () => {
    const resultat = filtrerContes(contes, { ...vide, langue: 'dioula', type: 'legende' })
    expect(resultat.every((c) => c.langue === 'dioula' && c.type === 'legende')).toBe(
      true,
    )
  })

  it('cherche dans le titre sans tenir compte des accents ni de la casse', () => {
    const resultat = filtrerContes(contes, { ...vide, recherche: 'PRINCESSE' })
    expect(resultat.map((c) => c.id)).toEqual(['yennenga'])
  })

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filtrerContes(contes, { ...vide, recherche: 'zzzz' })).toEqual([])
  })
})

describe('filtresActifs', () => {
  it('compte les filtres renseignés', () => {
    expect(filtresActifs(vide)).toBe(0)
    expect(filtresActifs({ ...vide, langue: 'moore', recherche: '  ' })).toBe(1)
  })
})
