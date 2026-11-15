import { describe, expect, it } from 'vitest'
import { effectColor, hexToRgb, isStaticEffect, type RGB } from '@/lib/lighting/renderer'
import type { LightingSettings } from '@/lib/lighting/settings'

const settings = (overrides: Partial<LightingSettings> = {}): LightingSettings => ({
  mode: 1,
  brightness: 5,
  speed: 3,
  direction: 0,
  colorful: false,
  color: '#ffffff',
  ...overrides,
})

const luminance = (c: RGB) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

describe('effectColor', () => {
  it('renders LED Off as black', () => {
    expect(effectColor(settings({ mode: 0 }), 0.4, 0.6, 2.5)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('uses the chosen colour for Static', () => {
    const c = effectColor(settings({ color: '#ff0000' }), 0.5, 0.5, 0)
    expect(c.r).toBeCloseTo(1)
    expect(c.g).toBeCloseTo(0)
    expect(c.b).toBeCloseTo(0)
  })

  it('scales linearly with brightness', () => {
    const dim = effectColor(settings({ brightness: 1 }), 0.5, 0.5, 0)
    const bright = effectColor(settings({ brightness: 5 }), 0.5, 0.5, 0)
    expect(luminance(dim) / luminance(bright)).toBeCloseTo(0.2)
  })

  it('is deterministic', () => {
    const s = settings({ mode: 4, colorful: true })
    expect(effectColor(s, 0.21, 0.77, 3.3)).toEqual(effectColor(s, 0.21, 0.77, 3.3))
  })

  it('changes phase with direction', () => {
    const right = effectColor(settings({ mode: 11, direction: 0, colorful: true }), 0.3, 0.5, 1)
    const left = effectColor(settings({ mode: 11, direction: 2, colorful: true }), 0.3, 0.5, 1)
    expect(right).not.toEqual(left)
  })

  it('produces in-range colours for every mode', () => {
    for (let mode = 0; mode <= 19; mode++) {
      for (const colorful of [true, false]) {
        const c = effectColor(settings({ mode, colorful, color: '#1ec85a' }), 0.65, 0.35, 4.2)
        for (const v of [c.r, c.g, c.b]) {
          expect(v, `mode ${mode}`).toBeGreaterThanOrEqual(0)
          expect(v, `mode ${mode}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('reports Off, Static and Colourful as static effects only', () => {
    expect([0, 1, 6].every(isStaticEffect)).toBe(true)
    expect(isStaticEffect(7)).toBe(false)
  })
})

describe('hexToRgb', () => {
  it('parses #rrggbb into 0–1 channels', () => {
    const c = hexToRgb('#ff8000')
    expect(c.r).toBe(1)
    expect(c.g).toBeCloseTo(128 / 255)
    expect(c.b).toBe(0)
  })
})
