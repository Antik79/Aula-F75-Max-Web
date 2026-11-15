import { useCallback, useEffect, useState } from 'react'
import { readStoredValue, writeStoredValue } from '@/lib/storage'
import {
  PROFILES_STORAGE_KEY,
  addProfile,
  deleteProfile,
  renameProfile,
  sanitizeProfiles,
  starterProfiles,
  updateProfileSettings,
  type LightingProfile,
} from '@/lib/lighting/profiles'
import type { LightingSettings } from '@/lib/lighting/settings'

function loadProfiles(): LightingProfile[] {
  const stored = readStoredValue<unknown>(PROFILES_STORAGE_KEY, undefined)
  // Nothing stored yet: first visit, so seed the starters.
  if (stored === undefined) return starterProfiles()
  return sanitizeProfiles(stored)
}

export function useLightingProfiles() {
  const [profiles, setProfiles] = useState<LightingProfile[]>(loadProfiles)

  useEffect(() => {
    writeStoredValue(PROFILES_STORAGE_KEY, profiles)
  }, [profiles])

  const add = useCallback((name: string, settings: LightingSettings) => {
    let created: LightingProfile | undefined
    setProfiles((current) => {
      const result = addProfile(current, name, settings)
      created = result.profile
      return result.profiles
    })
    return created
  }, [])

  const update = useCallback((id: string, settings: LightingSettings) => {
    setProfiles((current) => updateProfileSettings(current, id, settings))
  }, [])

  const rename = useCallback((id: string, name: string) => {
    setProfiles((current) => renameProfile(current, id, name))
  }, [])

  const remove = useCallback((id: string) => {
    setProfiles((current) => deleteProfile(current, id))
  }, [])

  /** Puts a deleted profile back at its old position (for toast "Undo"). */
  const restore = useCallback((profile: LightingProfile, index: number) => {
    setProfiles((current) => {
      if (current.some((p) => p.id === profile.id)) return current
      const next = [...current]
      next.splice(Math.min(index, next.length), 0, profile)
      return next
    })
  }, [])

  return { profiles, add, update, rename, remove, restore }
}
