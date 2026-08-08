import { describe, expect, it } from 'vitest'
import { computeFitRect } from '@/lib/display/fitRect'

describe('computeFitRect', () => {
  it('stretch always fills the target exactly', () => {
    expect(computeFitRect(200, 100, 128, 128, 'stretch')).toEqual({ x: 0, y: 0, width: 128, height: 128 })
  })

  it('contain letterboxes a wide source, centering vertically', () => {
    // source is 2:1, target is 1:1 -> width-limited, height shrinks and centers
    const rect = computeFitRect(200, 100, 128, 128, 'contain')
    expect(rect.width).toBe(128)
    expect(rect.height).toBe(64)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(32)
  })

  it('contain letterboxes a tall source, centering horizontally', () => {
    const rect = computeFitRect(100, 200, 128, 128, 'contain')
    expect(rect.height).toBe(128)
    expect(rect.width).toBe(64)
    expect(rect.y).toBe(0)
    expect(rect.x).toBe(32)
  })

  it('cover crops a wide source, overflowing horizontally', () => {
    const rect = computeFitRect(200, 100, 128, 128, 'cover')
    expect(rect.height).toBe(128)
    expect(rect.width).toBe(256)
    expect(rect.y).toBe(0)
    expect(rect.x).toBe(-64)
  })

  it('exact square source fills exactly regardless of mode', () => {
    expect(computeFitRect(128, 128, 128, 128, 'contain')).toEqual({ x: 0, y: 0, width: 128, height: 128 })
    expect(computeFitRect(128, 128, 128, 128, 'cover')).toEqual({ x: 0, y: 0, width: 128, height: 128 })
  })
})
