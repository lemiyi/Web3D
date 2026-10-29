import { describe, expect, it } from 'vitest'
import yennenga from '@/content/contes/yennenga.json'
import { ConteSchema } from './schemas'

describe('ConteSchema', () => {
  it('accepte le conte de démonstration', () => {
    expect(ConteSchema.safeParse(yennenga).success).toBe(true)
  })

  it('refuse un embranchement vers une scène inconnue', () => {
    const conte = structuredClone(yennenga)
    conte.scenes[1].choix![0].vers = 'inconnue'
    expect(ConteSchema.safeParse(conte).success).toBe(false)
  })

  it('refuse une scène orpheline', () => {
    const conte = structuredClone(yennenga)
    conte.scenes.push({ ...conte.scenes[2], id: 'orpheline' })
    expect(ConteSchema.safeParse(conte).success).toBe(false)
  })

  it('refuse une scène sans suite, choix ni fin', () => {
    const conte = structuredClone(yennenga)
    delete (conte.scenes[conte.scenes.length - 1] as { fin?: boolean }).fin
    expect(ConteSchema.safeParse(conte).success).toBe(false)
  })
})
