import { describe, expect, it } from 'vitest'
import { F75_MAX_LAYOUT as layout, normalizedCentre, type Rect } from '@/lib/lighting/keyboardLayout'

const inside = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

describe('F75_MAX_LAYOUT', () => {
  it('has 80 keys with unique ids', () => {
    expect(layout.keys).toHaveLength(80)
    expect(new Set(layout.keys.map((k) => k.id)).size).toBe(80)
  })

  it('has no overlapping keys', () => {
    for (const a of layout.keys) {
      for (const b of layout.keys) {
        if (a === b) continue
        const overlap =
          a.frame.x < b.frame.x + b.frame.width - 1e-9 &&
          b.frame.x < a.frame.x + a.frame.width - 1e-9 &&
          a.frame.y < b.frame.y + b.frame.height - 1e-9 &&
          b.frame.y < a.frame.y + a.frame.height - 1e-9
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }
  })

  it('fits everything inside the layout bounds, screen and knob right of F12', () => {
    const bounds = { x: 0, y: 0, width: layout.width, height: layout.height }
    for (const key of layout.keys) expect(inside(bounds, key.frame), key.id).toBe(true)
    expect(inside(bounds, layout.screenFrame)).toBe(true)
    const f12 = layout.keys.find((k) => k.id === 'F12')!
    expect(layout.screenFrame.x).toBeGreaterThan(f12.frame.x + f12.frame.width)
    expect(layout.knobCenter.x).toBeGreaterThan(layout.screenFrame.x + layout.screenFrame.width)
  })

  it('uses light caps on top rows and dark on bottom rows', () => {
    expect(layout.keys.find((k) => k.id === 'Q')!.tone).toBe('light')
    expect(layout.keys.find((k) => k.id === 'Z')!.tone).toBe('dark')
  })

  it('normalises key centres into 0–1', () => {
    for (const key of layout.keys) {
      const { x, y } = normalizedCentre(key)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(1)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(1)
    }
  })
})
