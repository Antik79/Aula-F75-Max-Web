import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_ACTIVITY_ENTRIES,
  clearActivity,
  formatActivityReport,
  getActivityEntries,
  hexHeader,
  logActivity,
  logActivityOnce,
  subscribeActivity,
} from '@/lib/activity/log'

describe('activity log', () => {
  beforeEach(() => clearActivity())

  it('appends entries and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeActivity(listener)
    logActivity('wired', 'info', 'hello')
    expect(getActivityEntries()).toMatchObject([{ source: 'wired', level: 'info', message: 'hello' }])
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    logActivity('wired', 'info', 'again')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('returns a new array on change so useSyncExternalStore re-renders', () => {
    const before = getActivityEntries()
    logActivity('app', 'info', 'x')
    expect(getActivityEntries()).not.toBe(before)
  })

  it(`keeps only the newest ${MAX_ACTIVITY_ENTRIES} entries`, () => {
    for (let i = 0; i < MAX_ACTIVITY_ENTRIES + 5; i++) logActivity('app', 'info', `#${i}`)
    const entries = getActivityEntries()
    expect(entries).toHaveLength(MAX_ACTIVITY_ENTRIES)
    expect(entries[0].message).toBe('#5')
  })

  it('logs once per key until cleared', () => {
    logActivityOnce('k', 'app', 'info', 'first')
    logActivityOnce('k', 'app', 'info', 'second')
    expect(getActivityEntries().map((e) => e.message)).toEqual(['first'])
    clearActivity()
    logActivityOnce('k', 'app', 'info', 'third')
    expect(getActivityEntries().map((e) => e.message)).toEqual(['third'])
  })

  it('formats a report with an environment header', () => {
    logActivity('dongle', 'error', 'boom')
    const report = formatActivityReport(getActivityEntries(), {
      appVersion: 'abc1234',
      userAgent: 'TestBrowser/1',
      webHidSupported: true,
      mode: 'hardware',
    })
    expect(report).toContain('App: abc1234')
    expect(report).toContain('Browser: TestBrowser/1')
    expect(report).toMatch(/\d\d:\d\d:\d\d\.\d{3} ERROR dongle boom/)
  })

  it('formats hex headers', () => {
    expect(hexHeader(new Uint8Array([0x04, 0x18, 0xff]))).toBe('04 18')
  })
})
