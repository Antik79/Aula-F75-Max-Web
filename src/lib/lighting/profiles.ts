import type { LightingSettings } from './settings'

/**
 * A named lighting look the user saved. Profiles live in this browser's
 * localStorage, not on the keyboard — the protocol has no profile slots.
 * Ported from upstream Aula-F75-Max-Driver's LightingProfileStore.
 */
export interface LightingProfile {
  id: string
  name: string
  settings: LightingSettings
}

export const PROFILES_STORAGE_KEY = 'aula.lighting.profiles.v1'

export function starterProfiles(makeId: () => string = newProfileId): LightingProfile[] {
  return [
    {
      id: makeId(),
      name: 'Rainbow Wave',
      settings: { mode: 11, brightness: 4, speed: 3, direction: 0, colorful: true, color: '#007aff' },
    },
    {
      id: makeId(),
      name: 'Calm Breath',
      settings: { mode: 7, brightness: 3, speed: 2, direction: 0, colorful: false, color: '#007aff' },
    },
    {
      id: makeId(),
      name: 'Off',
      settings: { mode: 0, brightness: 1, speed: 1, direction: 0, colorful: true, color: '#007aff' },
    },
  ]
}

export function addProfile(
  profiles: LightingProfile[],
  name: string,
  settings: LightingSettings,
  makeId: () => string = newProfileId,
): { profiles: LightingProfile[]; profile: LightingProfile } {
  const profile = { id: makeId(), name: name.trim() || 'Untitled', settings: { ...settings } }
  return { profiles: [...profiles, profile], profile }
}

export function updateProfileSettings(profiles: LightingProfile[], id: string, settings: LightingSettings) {
  return profiles.map((p) => (p.id === id ? { ...p, settings: { ...settings } } : p))
}

export function renameProfile(profiles: LightingProfile[], id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return profiles
  return profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
}

export function deleteProfile(profiles: LightingProfile[], id: string) {
  return profiles.filter((p) => p.id !== id)
}

/**
 * Validates whatever was in storage. Unreadable entries are dropped rather
 * than crashing, and a non-array yields an empty list (not starters, so
 * deleted starters don't come back).
 */
export function sanitizeProfiles(value: unknown): LightingProfile[] {
  if (!Array.isArray(value)) return []
  return value.filter(isProfile)
}

function isProfile(value: unknown): value is LightingProfile {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  const s = p.settings as Record<string, unknown> | undefined
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof s === 'object' &&
    s !== null &&
    typeof s.mode === 'number' &&
    typeof s.brightness === 'number' &&
    typeof s.speed === 'number' &&
    typeof s.direction === 'number' &&
    typeof s.colorful === 'boolean' &&
    typeof s.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(s.color)
  )
}

function newProfileId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
