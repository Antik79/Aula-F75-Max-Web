import { useEffect, useState } from 'react'
import { readStoredValue, writeStoredValue } from '@/lib/storage'

/**
 * Like useState, but the protocol has no command to read RGB/performance
 * settings back from the device — only battery is queryable. So there's no
 * way to show what the keyboard is actually set to; this persists the last
 * value you picked locally instead, surviving reloads and reconnects.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, defaultValue))

  useEffect(() => {
    writeStoredValue(key, value)
  }, [key, value])

  return [value, setValue] as const
}
