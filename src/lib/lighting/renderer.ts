import type { LightingSettings } from './settings'

/** A colour with each channel in 0–1. */
export interface RGB {
  r: number
  g: number
  b: number
}

export const BLACK: RGB = { r: 0, g: 0, b: 0 }

/**
 * Approximates each firmware lighting effect so the app can preview it.
 * Ported from upstream Aula-F75-Max-Driver's AulaCore/LightingEffectRenderer.
 *
 * Pure: the same settings, key position and time always give the same colour.
 * These are approximations — the app cannot read the firmware's real animation.
 *
 * @param x key centre, 0–1 left→right across the keyboard
 * @param y key centre, 0–1 top→bottom
 * @param time seconds since any fixed starting point
 */
export function effectColor(settings: LightingSettings, x: number, y: number, time: number): RGB {
  const rate = 0.15 + clamp(settings.speed, 1, 5) * 0.15
  const brightness = clamp(settings.brightness, 1, 5) / 5
  const along = alongDirection(x, y, settings.direction)
  const phase = time * rate
  const base = (hue: number) => baseColor(settings, hue)

  let color: RGB
  switch (settings.mode) {
    case 0: // LED Off
      return BLACK
    case 1: // Static
      color = base(x * 0.85)
      break
    case 2: // Single On: keys light up as if pressed, then fade
      color = scale(base(x), pressFlash(x, y, time, rate))
      break
    case 3: // Single Off: lit board, pressed keys go dark briefly
      color = scale(base(x), 1 - pressFlash(x, y, time, rate))
      break
    case 4: // Glittering
      color = scale(base(hash(x, y, Math.floor(time * rate * 6))), sparkle(x, y, time, rate))
      break
    case 5: {
      // Falling: streaks running down each column
      const streak = fract(y - phase * 1.5 + hash(Math.floor(x * 16), 0, 0)) ** 4
      color = scale(base(x), streak)
      break
    }
    case 6: // Colourful: a still rainbow across the board
      color = base(x)
      break
    case 7: // Breath
      color = scale(base(Math.floor(phase * 0.5) * 0.17), breath(phase))
      break
    case 8: // Spectrum: the whole board cycles through colours
      color = base(phase * 0.25)
      break
    case 9: // Outward: rings moving out from the centre
      color = scale(base(centreDistance(x, y) - phase), ring(centreDistance(x, y) * 2 - phase * 2))
      break
    case 10: // Scrolling: a band of light moving along the direction
      color = scale(base(along - phase), ring(along * 1.5 - phase * 1.5))
      break
    case 11: // Rolling: a rainbow wave along the direction
      color = base(along - phase)
      break
    case 12: {
      // Rotating: colours sweep around the centre
      const angle = Math.atan2(y - 0.5, x - 0.5) / (2 * Math.PI)
      color = base(angle + phase * 0.5)
      break
    }
    case 13: {
      // Explode: periodic bursts from the centre
      const burst = fract(phase * 0.5)
      const distance = Math.abs(centreDistance(x, y) - burst * 0.9)
      color = scale(base(burst), Math.max(0, 1 - distance * 8) * (1 - burst * 0.6))
      break
    }
    case 14: {
      // Launch: streaks rising up each column
      const streak = fract(1 - y - phase * 1.5 + hash(Math.floor(x * 16), 1, 0)) ** 4
      color = scale(base(x), streak)
      break
    }
    case 15: // Ripples: rings from a few moving drop points
      color = ripples(settings, x, y, phase)
      break
    case 16: // Flowing: a diagonal rainbow flow
      color = base((along + (settings.direction % 2 === 0 ? y : x) * 0.5) * 0.7 - phase)
      break
    case 17: // Pulsating: whole-board pulses, new colour each pulse
      color = scale(base(Math.floor(phase) * 0.23), (1 - fract(phase)) ** 2)
      break
    case 18: {
      // Tilt: a gradient that rocks back and forth
      const tilt = Math.sin(phase * 2 * Math.PI * 0.5) * 0.5
      color = base(along * 0.6 + y * tilt)
      break
    }
    case 19: {
      // Shuttle: a bar sliding back and forth
      const position = 0.5 - 0.5 * Math.cos(phase * Math.PI)
      color = scale(base(position), Math.max(0, 1 - Math.abs(along - position) * 6))
      break
    }
    default: // Unknown effect: a slow rainbow so something sensible shows
      color = base(x - time * 0.1)
  }

  return scale(color, brightness)
}

/** Effects whose preview never changes over time, so the canvas can stop animating. */
export function isStaticEffect(mode: number): boolean {
  return mode === 0 || mode === 1 || mode === 6
}

// --- Building blocks ---

function baseColor(settings: LightingSettings, hue: number): RGB {
  if (settings.colorful) return hsv(fract(hue), 1, 1)
  return hexToRgb(settings.color)
}

function alongDirection(x: number, y: number, direction: number): number {
  switch (direction) {
    case 1:
      return y
    case 2:
      return 1 - x
    case 3:
      return 1 - y
    default:
      return x
  }
}

function breath(phase: number): number {
  return 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI * 0.5)
}

/** 1 on the crest of a repeating wave, falling to 0 between crests. */
function ring(value: number): number {
  return (0.5 + 0.5 * Math.cos(fract(value) * 2 * Math.PI)) ** 3
}

function centreDistance(x: number, y: number): number {
  const dx = x - 0.5
  const dy = (y - 0.5) * 0.4 // the board is about 2.5x wider than tall
  return Math.sqrt(dx * dx + dy * dy)
}

/** A key "pressed" at a random moment every cycle, glowing then fading. */
function pressFlash(x: number, y: number, time: number, rate: number): number {
  const cycle = time * rate * 1.5 + hash(x, y, 7) * 8
  const age = fract(cycle)
  const pressedThisCycle = hash(x, y, Math.floor(cycle)) > 0.82
  return pressedThisCycle ? (1 - age) ** 2 : 0
}

function sparkle(x: number, y: number, time: number, rate: number): number {
  const cycle = time * rate * 3 + hash(x, y, 3) * 5
  const visible = hash(x, y, Math.floor(cycle)) > 0.55
  return visible ? 1 - fract(cycle) * 0.7 : 0.08
}

function ripples(settings: LightingSettings, x: number, y: number, phase: number): RGB {
  let intensity = 0
  let hue = 0
  for (let drop = 0; drop < 3; drop++) {
    const cycle = phase * 0.6 + drop / 3
    const index = Math.floor(cycle)
    const dx = x - hash(index, drop, 11)
    const dy = (y - hash(index, drop, 13)) * 0.4
    const distance = Math.sqrt(dx * dx + dy * dy)
    const radius = fract(cycle) * 0.6
    const strength = Math.max(0, 1 - Math.abs(distance - radius) * 14) * (1 - fract(cycle))
    if (strength > intensity) {
      intensity = strength
      hue = hash(index, drop, 17)
    }
  }
  return scale(baseColor(settings, hue), intensity)
}

// --- Maths helpers ---

function fract(value: number): number {
  return value - Math.floor(value)
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

function scale(color: RGB, factor: number): RGB {
  return {
    r: clamp(color.r * factor, 0, 1),
    g: clamp(color.g * factor, 0, 1),
    b: clamp(color.b * factor, 0, 1),
  }
}

/** A repeatable pseudo-random number in [0, 1) for the given inputs. */
function hash(a: number, b: number, c: number): number {
  return fract(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453)
}

export function hsv(hue: number, saturation: number, value: number): RGB {
  const sector = hue * 6
  const index = ((Math.floor(sector) % 6) + 6) % 6
  const f = sector - Math.floor(sector)
  const p = value * (1 - saturation)
  const q = value * (1 - saturation * f)
  const t = value * (1 - saturation * (1 - f))
  switch (index) {
    case 0:
      return { r: value, g: t, b: p }
    case 1:
      return { r: q, g: value, b: p }
    case 2:
      return { r: p, g: value, b: t }
    case 3:
      return { r: p, g: q, b: value }
    case 4:
      return { r: t, g: p, b: value }
    default:
      return { r: value, g: p, b: q }
  }
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1, 7), 16)
  if (Number.isNaN(n)) return BLACK
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 }
}

export function rgbToCss(color: RGB, alpha = 1): string {
  const to255 = (v: number) => Math.round(clamp(v, 0, 1) * 255)
  return `rgba(${to255(color.r)}, ${to255(color.g)}, ${to255(color.b)}, ${alpha})`
}
