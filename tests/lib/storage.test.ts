import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStoredValue, writeStoredValue } from '@/lib/storage'

function fakeLocalStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => map.delete(key),
  }
}

describe('readStoredValue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the fallback when the key is not present', () => {
    vi.stubGlobal('localStorage', fakeLocalStorage())
    expect(readStoredValue('missing', 'fallback')).toBe('fallback')
  })

  it('returns the parsed value when present', () => {
    const storage = fakeLocalStorage()
    storage.setItem('rgb-mode', JSON.stringify(7))
    vi.stubGlobal('localStorage', storage)
    expect(readStoredValue('rgb-mode', 1)).toBe(7)
  })

  it('returns the fallback when the stored value is corrupted JSON', () => {
    const storage = fakeLocalStorage()
    storage.setItem('rgb-mode', 'not json')
    vi.stubGlobal('localStorage', storage)
    expect(readStoredValue('rgb-mode', 1)).toBe(1)
  })

  it('returns the fallback when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(readStoredValue('rgb-mode', 1)).toBe(1)
  })
})

describe('writeStoredValue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('JSON-serializes the value under the given key', () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal('localStorage', storage)
    writeStoredValue('rgb-color', '#ff0000')
    expect(storage.getItem('rgb-color')).toBe('"#ff0000"')
  })

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => writeStoredValue('rgb-color', '#ff0000')).not.toThrow()
  })

  it('does not throw when the underlying store throws (e.g. quota exceeded)', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() => writeStoredValue('rgb-color', '#ff0000')).not.toThrow()
  })
})
