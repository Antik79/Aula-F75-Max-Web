import { batteryQuery, keyResponseReport, rgbCommitReport, rgbLEDReport } from '@/lib/protocol'
import type { ApplyPerformanceOptions, ApplyRgbOptions, AulaDongleDevice } from '@/lib/device/types'
import { sendOutputReport, waitForInputReport, type HidPort } from './hidPort'
import { clamp } from './normalize'
import { delay } from '@/lib/timing'
import { logActivity, logActivityOnce } from '@/lib/activity/log'

export type { ApplyPerformanceOptions, ApplyRgbOptions }

const BATTERY_QUERY_LENGTHS = [64, 33, 32]
const BATTERY_ACK_TIMEOUT_MS = 250

export function parseBatteryPercent(view: DataView): number | null {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  if (bytes.length >= 4 && bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[3] > 0 && bytes[3] <= 100) {
    return bytes[3]
  }
  if (bytes.length >= 5 && bytes[1] === 0x20 && bytes[2] === 0x01 && bytes[4] > 0 && bytes[4] <= 100) {
    return bytes[4]
  }
  return null
}

export class DongleAulaDevice implements AulaDongleDevice {
  private readonly port: HidPort

  constructor(port: HidPort) {
    this.port = port
  }

  async applyRGB(options: ApplyRgbOptions): Promise<void> {
    await sendOutputReport(this.port, rgbCommitReport())
    await delay(50)
    await sendOutputReport(
      this.port,
      rgbLEDReport({
        mode: clamp(options.mode, 0, 31),
        brightness: clamp(options.brightness, 1, 5),
        speed: clamp(options.speed, 1, 5),
        direction: clamp(options.direction, 0, 3),
        colorful: options.colorful ? 1 : 0,
        color: clamp(options.color, 0, 0xffffff),
      }),
    )
  }

  async applyPerformance(options: ApplyPerformanceOptions): Promise<void> {
    const report = keyResponseReport({
      responseLevel: clamp(options.level, 1, 5),
      sleepTime: clamp(options.sleepTime, 0, 3),
      disableWin: options.disableWin ? 1 : 0,
      disableAltF4: options.disableAltF4 ? 1 : 0,
      disableAltTab: options.disableAltTab ? 1 : 0,
    })
    await sendOutputReport(this.port, report)
  }

  async queryBattery(): Promise<number | null> {
    for (const length of BATTERY_QUERY_LENGTHS) {
      for (const includeReportID of [false, true]) {
        await sendOutputReport(this.port, batteryQuery({ includeReportID, length }))
        const ack = await waitForInputReport(this.port, BATTERY_ACK_TIMEOUT_MS)
        const percent = ack ? parseBatteryPercent(ack) : null
        if (percent !== null) {
          logActivityOnce(
            `battery-format-${length}-${includeReportID}`,
            'dongle',
            'info',
            `Battery reply received for a ${length}-byte query ${includeReportID ? 'with' : 'without'} report ID`,
          )
          return percent
        }
      }
    }
    logActivity('dongle', 'warn', 'Battery query: no valid reply in any of the known formats')
    return null
  }
}
