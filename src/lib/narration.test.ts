import { describe, expect, it } from 'vitest'
import { motActif, motsDuTexte, nettoyerPourVoix, rangDePhrase } from './narration'

describe('narration', () => {
  it('blanchit les crochets sans changer la longueur du texte', () => {
    const texte = '[Démo] Elle part. Vite !'
    const propre = nettoyerPourVoix(texte)
    expect(propre).toHaveLength(texte.length)
    expect(propre.trim()).toBe('Elle part. Vite !')
  })

  it('repère les mots avec leur position', () => {
    const mots = motsDuTexte('Elle part vite')
    expect(mots.map((m) => m.texte)).toEqual(['Elle', 'part', 'vite'])
    expect(mots[1].debut).toBe(5)
  })

  it('trouve le mot lu pour une position donnée', () => {
    const mots = motsDuTexte('Elle part vite')
    expect(motActif(mots, -1)).toBe(-1)
    expect(motActif(mots, 0)).toBe(0)
    expect(motActif(mots, 7)).toBe(1)
    expect(motActif(mots, 999)).toBe(2)
  })

  it('trouve la phrase en cours', () => {
    const texte = 'Elle part. Elle revient ! Fin.'
    expect(rangDePhrase(texte, 3)).toBe(0)
    expect(rangDePhrase(texte, 12)).toBe(1)
    expect(rangDePhrase(texte, 27)).toBe(2)
    expect(rangDePhrase(texte, -1)).toBe(-1)
  })
})
