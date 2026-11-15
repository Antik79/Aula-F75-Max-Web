import { describe, expect, it } from 'vitest'
import {
  addProfile,
  deleteProfile,
  renameProfile,
  sanitizeProfiles,
  starterProfiles,
  updateProfileSettings,
} from '@/lib/lighting/profiles'
import type { LightingSettings } from '@/lib/lighting/settings'

const look: LightingSettings = { mode: 7, brightness: 2, speed: 4, direction: 1, colorful: false, color: '#123456' }
let counter = 0
const makeId = () => `id-${++counter}`

describe('lighting profiles', () => {
  it('ships three valid starters', () => {
    const starters = starterProfiles(makeId)
    expect(starters.map((p) => p.name)).toEqual(['Rainbow Wave', 'Calm Breath', 'Off'])
    expect(sanitizeProfiles(starters)).toHaveLength(3)
  })

  it('adds a copy of the settings with a trimmed name', () => {
    const settings = { ...look }
    const { profiles, profile } = addProfile([], '  Night  ', settings, makeId)
    settings.mode = 1
    expect(profiles).toEqual([profile])
    expect(profile.name).toBe('Night')
    expect(profile.settings.mode).toBe(7)
  })

  it('falls back to "Untitled" for a blank name', () => {
    expect(addProfile([], '   ', look, makeId).profile.name).toBe('Untitled')
  })

  it('updates, renames and deletes by id without touching others', () => {
    const { profiles: one, profile: a } = addProfile([], 'A', look, makeId)
    const { profiles: two, profile: b } = addProfile(one, 'B', look, makeId)

    const updated = updateProfileSettings(two, a.id, { ...look, mode: 2 })
    expect(updated.find((p) => p.id === a.id)!.settings.mode).toBe(2)
    expect(updated.find((p) => p.id === b.id)!.settings.mode).toBe(7)

    const renamed = renameProfile(updated, b.id, 'Bee')
    expect(renamed.find((p) => p.id === b.id)!.name).toBe('Bee')
    expect(renameProfile(updated, b.id, '  ')).toBe(updated)

    expect(deleteProfile(renamed, a.id).map((p) => p.id)).toEqual([b.id])
  })

  it('drops malformed stored entries and treats non-arrays as empty', () => {
    const good = addProfile([], 'Ok', look, makeId).profile
    expect(sanitizeProfiles([good, { id: 1 }, null, { ...good, settings: { ...look, color: 'red' } }])).toEqual([good])
    expect(sanitizeProfiles('nope')).toEqual([])
  })
})
