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
  sleepTime: number
  disableWin: number
  disableAltF4: number
  disableAltTab: number
}

export function keyResponseReport(options: KeyResponseOptions): Uint8Array {
  const { responseLevel, sleepTime, disableWin, disableAltF4, disableAltTab } = options
  const report = new Uint8Array(32)
  report[0] = 0x07
  report[1] = 0x10
  report[2] = 0x00
  report[3] = 0x00
  // Bytes 4-7 stay zero. The reference implementation hardcoded them to 1 for
  // every performance-family packet; confirmed on real hardware that this
  // caused a plain response-rate change to also trigger the Windows-key-lock
  // side effect.
  report[8] = 1 // fnSwitch — confirmed inert as an experiment variable, standardized at 1
  report[9] = sleepTime
  report[11] = responseLevel
  // No standalone "Game Mode" toggle exists in the vendor software — only the
  // three independent disable flags below. This byte has no vendor-UI
  // equivalent; derived as an "any restriction active" aggregate.
  report[12] = disableWin || disableAltF4 || disableAltTab ? 1 : 0
  report[13] = disableAltTab
  report[14] = disableAltF4
  report[15] = disableWin
  report[17] = 0xaa
  report[18] = 0x55
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
