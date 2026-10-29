import { describe, expect, it } from 'vitest'
import { decoderTerrarium, tuileDe } from './altitude'

describe('altitude', () => {
  it('décode le niveau de la mer et une altitude connue', () => {
    expect(decoderTerrarium(128, 0, 0)).toBe(0)
    // 128*256 + 1*1 + 0 - 32768 = 1
    expect(decoderTerrarium(128, 1, 0)).toBe(1)
    expect(decoderTerrarium(127, 255, 0)).toBe(-1)
  })

  it('trouve la tuile et le pixel d’un point', () => {
    expect(tuileDe(0, 0, 1)).toEqual({ tx: 1, ty: 1, px: 0, py: 0 })
    const ouaga = tuileDe(-1.52, 12.37)
    expect(ouaga.tx).toBe(253)
    expect(ouaga.ty).toBe(238)
  })
})
