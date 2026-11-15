import type { AulaDongleDevice, AulaWiredDevice, ApplyPerformanceOptions, ApplyRgbOptions } from '@/lib/device/types'
import { RGB_MODES } from '@/lib/device/labels'
import { errorMessage, logActivity, type ActivitySource } from './log'

/**
 * Wraps a device so every high-level operation logs its outcome and duration.
 * Applied in one place (the connection context) to real and demo devices
 * alike, so the device classes stay free of UI concerns.
 */
async function logged<T>(
  source: ActivitySource,
  label: string,
  run: () => Promise<T>,
  describe?: (result: T) => string,
): Promise<T> {
  const started = performance.now()
  try {
    const result = await run()
    const ms = Math.round(performance.now() - started)
    logActivity(source, 'info', `${label}: ${describe ? describe(result) : 'done'} (${ms} ms)`)
    return result
  } catch (error) {
    const ms = Math.round(performance.now() - started)
    logActivity(source, 'error', `${label} failed after ${ms} ms: ${errorMessage(error)}`)
    throw error
  }
}

function describeRgb(o: ApplyRgbOptions): string {
  const mode = RGB_MODES.find((m) => m.id === o.mode)?.title ?? `mode ${o.mode}`
  const colour = o.colorful ? 'colourful' : `#${o.color.toString(16).padStart(6, '0')}`
  return `${mode}, brightness ${o.brightness}, speed ${o.speed}, direction ${o.direction}, ${colour}`
}

function describePerformance(o: ApplyPerformanceOptions): string {
  const locks = [o.disableWin && 'Win', o.disableAltF4 && 'Alt+F4', o.disableAltTab && 'Alt+Tab'].filter(Boolean)
  return `response level ${o.level}, sleep ${o.sleepTime}, locked: ${locks.length ? locks.join(', ') : 'none'}`
}

export function withDongleLogging(device: AulaDongleDevice): AulaDongleDevice {
  return {
    applyRGB: (options) => logged('dongle', `Apply RGB (${describeRgb(options)})`, () => device.applyRGB(options)),
    applyPerformance: (options) =>
      logged('dongle', `Apply performance (${describePerformance(options)})`, () => device.applyPerformance(options)),
    queryBattery: () =>
      logged('dongle', 'Battery query', () => device.queryBattery(), (p) => (p === null ? 'no reading' : `${p}%`)),
  }
}

export function withWiredLogging(device: AulaWiredDevice): AulaWiredDevice {
  return {
    syncTime: (date) => logged('wired', 'Clock sync', () => device.syncTime(date)),
    uploadDisplayStream: (stream, slot, onProgress) => {
      let total = 0
      return logged(
        'wired',
        `Display upload (slot ${slot}, ${stream.length} bytes)`,
        () =>
          device.uploadDisplayStream(stream, slot, (progress) => {
            total = progress.totalChunks
            onProgress(progress)
          }),
        () => `${total} chunks sent`,
      )
    },
    factoryReset: (onProgress) =>
      logged('wired', 'Factory reset', () =>
        device.factoryReset((step) => {
          logActivity('wired', 'info', `Factory reset: ${step}`)
          onProgress(step)
        }),
      ),
  }
}
