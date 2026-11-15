import { describe, expect, it } from 'vitest'
import { GUIDE_GROUPS, rowsForMode } from '@/lib/guide/catalog'
import { F75_MAX_LAYOUT } from '@/lib/lighting/keyboardLayout'

const keycapLabels = new Set(F75_MAX_LAYOUT.keys.map((k) => k.label))

describe('keyboard guide catalog', () => {
  it('only references keys that exist on the F75 Max (plus the knob)', () => {
    for (const group of GUIDE_GROUPS) {
      for (const row of group.rows) {
        for (const key of row.keys) {
          expect(key === 'Knob' || keycapLabels.has(key), `${group.id}: ${key}`).toBe(true)
        }
      }
    }
  })

  it('lists a full F1–F12 row for each mode, Fn-modified only on Windows', () => {
    const media = GUIDE_GROUPS.find((g) => g.id === 'media')!
    const windows = rowsForMode(media, 'windows')
    const mac = rowsForMode(media, 'mac')
    expect(windows).toHaveLength(12)
    expect(mac).toHaveLength(12)
    expect(windows.every((r) => r.keys[0] === 'Fn')).toBe(true)
    expect(mac.every((r) => r.keys.length === 1)).toBe(true)
  })

  it('shows mode-independent groups identically in both modes', () => {
    const lighting = GUIDE_GROUPS.find((g) => g.id === 'lighting')!
    expect(rowsForMode(lighting, 'windows')).toEqual(rowsForMode(lighting, 'mac'))
  })

  it('has unique group ids', () => {
    expect(new Set(GUIDE_GROUPS.map((g) => g.id)).size).toBe(GUIDE_GROUPS.length)
  })
})
