import { applyChecksum } from './checksum'

export function rgbCommitReport(): Uint8Array {
  const report = new Uint8Array(32)
  report[0] = 0x0f
  applyChecksum(report, 31)
  return report
}

export interface RgbLedOptions {
  mode: number
  brightness: number
  speed: number
  direction: number
  colorful: number
  color: number
}

export function rgbLEDReport(options: RgbLedOptions): Uint8Array {
  const { mode, brightness, speed, direction, colorful, color } = options
  const report = new Uint8Array(32)
  report[0] = 0x05
  report[1] = 0x10
  report[2] = 0x00
  report[3] = mode
  if (mode !== 0) {
    report[4] = color & 0xff
    report[5] = (color >> 8) & 0xff
    report[6] = (color >> 16) & 0xff
    report[11] = colorful
    report[12] = brightness
    report[13] = speed
    report[14] = direction
  }
  report[17] = 0xaa
  report[18] = 0x55
  applyChecksum(report, 31)
  return report
}

export interface KeyResponseOptions {
  responseLevel: number
  fnSwitch: number
  sleepTime: number
}

export function keyResponseReport(options: KeyResponseOptions): Uint8Array {
  const { responseLevel, fnSwitch, sleepTime } = options
  const report = new Uint8Array(32)
  report[0] = 0x07
  report[1] = 0x10
  report[2] = 0x00
  report[3] = 0x00
  report[4] = 0x01
  report[5] = 0x01
  report[6] = 0x01
  report[7] = 0x01
  report[8] = fnSwitch
  report[9] = sleepTime
  report[11] = responseLevel
  report[17] = 0xaa
  report[18] = 0x55
  applyChecksum(report, 31)
  return report
}

export interface GameModeOptions extends KeyResponseOptions {
  gameMode: number
  disableAltTab: number
  disableAltF4: number
  disableWin: number
}

export function gameModeReport(options: GameModeOptions): Uint8Array {
  const { gameMode, disableAltTab, disableAltF4, disableWin, ...responseOptions } = options
  const report = keyResponseReport(responseOptions)
  report[12] = gameMode
  report[13] = disableAltTab
  report[14] = disableAltF4
  report[15] = disableWin
  applyChecksum(report, 31)
  return report
}

export interface BatteryQueryOptions {
  includeReportID: boolean
  length: number
}

export function batteryQuery(options: BatteryQueryOptions): Uint8Array {
  const { includeReportID, length } = options
  const payload = new Uint8Array(Math.max(length, 0))
  if (payload.length === 0) return payload

  if (includeReportID) {
    payload[0] = 0x00
    if (payload.length > 1) payload[1] = 0x20
    if (payload.length > 2) payload[2] = 0x01
  } else {
    payload[0] = 0x20
    if (payload.length > 1) payload[1] = 0x01
  }

  const checksumIndex = includeReportID ? 32 : 31
  applyChecksum(payload, checksumIndex)
  return payload
}
