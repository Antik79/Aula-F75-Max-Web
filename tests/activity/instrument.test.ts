import { beforeEach, describe, expect, it } from 'vitest'
import { clearActivity, getActivityEntries } from '@/lib/activity/log'
import { withDongleLogging, withWiredLogging } from '@/lib/activity/instrument'
import type { AulaDongleDevice, AulaWiredDevice } from '@/lib/device/types'

const dongle = (overrides: Partial<AulaDongleDevice> = {}): AulaDongleDevice => ({
  applyRGB: async () => {},
  applyPerformance: async () => {},
  queryBattery: async () => 81,
  ...overrides,
})

describe('device logging wrappers', () => {
  beforeEach(() => clearActivity())

  it('logs successful operations with a description', async () => {
    const device = withDongleLogging(dongle())
    await device.applyRGB({ mode: 1, brightness: 3, speed: 2, direction: 0, colorful: false, color: 0xff8800 })
    await device.queryBattery()
    const messages = getActivityEntries().map((e) => e.message)
    expect(messages[0]).toMatch(/^Apply RGB \(Static, brightness 3, speed 2, direction 0, #ff8800\): done \(\d+ ms\)$/)
    expect(messages[1]).toMatch(/^Battery query: 81% /)
  })

  it('logs failures as errors and rethrows', async () => {
    const device = withDongleLogging(
      dongle({
        applyPerformance: async () => {
          throw new DOMException('Failed to write the report.', 'NotAllowedError')
        },
      }),
    )
    await expect(
      device.applyPerformance({ level: 5, sleepTime: 1, disableWin: true, disableAltF4: false, disableAltTab: false }),
    ).rejects.toThrow('Failed to write the report.')
    const [entry] = getActivityEntries()
    expect(entry.level).toBe('error')
    expect(entry.message).toContain('locked: Win')
    expect(entry.message).toContain('NotAllowedError: Failed to write the report.')
  })

  it('logs factory reset steps and still forwards progress', async () => {
    const steps: string[] = []
    const wired: AulaWiredDevice = {
      syncTime: async () => {},
      uploadDisplayStream: async () => {},
      factoryReset: async (onProgress) => {
        onProgress('Step A')
        onProgress('Step B')
      },
    }
    await withWiredLogging(wired).factoryReset((s) => steps.push(s))
    expect(steps).toEqual(['Step A', 'Step B'])
    expect(getActivityEntries().map((e) => e.message)).toEqual([
      'Factory reset: Step A',
      'Factory reset: Step B',
      expect.stringMatching(/^Factory reset: done/),
    ])
  })
})
