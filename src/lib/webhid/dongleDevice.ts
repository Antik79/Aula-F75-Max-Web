import { batteryQuery, gameModeReport, keyResponseReport, rgbCommitReport, rgbLEDReport } from '@/lib/protocol'
import type { ApplyPerformanceOptions, ApplyRgbOptions, AulaDongleDevice, SetGameModeOptions } from '@/lib/device/types'
import { sendOutputReport, waitForInputReport, type HidPort } from './hidPort'
import { clamp } from './normalize'
import { delay } from '@/lib/timing'

export type { ApplyPerformanceOptions, ApplyRgbOptions, SetGameModeOptions }

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
    await sendOutputReport(
      this.port,
      keyResponseReport({
        responseLevel: clamp(options.level, 1, 5),
        fnSwitch: 1,
        sleepTime: clamp(options.sleepTime, 0, 3),
      }),
    )
  }

  async setGameMode(options: SetGameModeOptions): Promise<void> {
    const value = options.enabled ? 1 : 0
    await sendOutputReport(
      this.port,
      gameModeReport({
        responseLevel: clamp(options.level, 1, 5),
        fnSwitch: 1,
        sleepTime: clamp(options.sleepTime, 0, 3),
        gameMode: value,
        disableAltTab: value,
        disableAltF4: value,
        disableWin: value,
      }),
    )
  }

  async queryBattery(): Promise<number | null> {
    for (const length of BATTERY_QUERY_LENGTHS) {
      for (const includeReportID of [false, true]) {
        await sendOutputReport(this.port, batteryQuery({ includeReportID, length }))
        const ack = await waitForInputReport(this.port, BATTERY_ACK_TIMEOUT_MS)
        const percent = ack ? parseBatteryPercent(ack) : null
        if (percent !== null) return percent
      }
    }
    return null
  }
}
