import { describe, expect, it } from 'vitest'
import {
  batteryQuery,
  gameModeReport,
  keyResponseReport,
  rgbCommitReport,
  rgbLEDReport,
} from '@/lib/protocol/wirelessReports'

describe('rgbCommitReport', () => {
  it('builds a 32-byte report with opcode 0x0f and a trailing checksum', () => {
    const result = rgbCommitReport()

    expect(result).toHaveLength(32)
    expect(result[0]).toBe(0x0f)
    expect(result[31]).toBe(0x0f) // sum of all other bytes is just the opcode
  })
})

describe('rgbLEDReport', () => {
  it('encodes mode, color, brightness, speed, direction, and footer when mode is nonzero', () => {
    const result = rgbLEDReport({
      mode: 3,
      brightness: 5,
      speed: 3,
      direction: 1,
      colorful: 1,
      color: 0x112233,
    })

    expect(result).toHaveLength(32)
    expect(result[0]).toBe(0x05)
    expect(result[1]).toBe(0x10)
    expect(result[3]).toBe(3) // mode
    expect(result[4]).toBe(0x33) // color low byte
    expect(result[5]).toBe(0x22) // color mid byte
    expect(result[6]).toBe(0x11) // color high byte
    expect(result[11]).toBe(1) // colorful
    expect(result[12]).toBe(5) // brightness
    expect(result[13]).toBe(3) // speed
    expect(result[14]).toBe(1) // direction
    expect(result[17]).toBe(0xaa)
    expect(result[18]).toBe(0x55)
    expect(result[31]).toBe(135) // checksum
  })

  it('leaves color/brightness/speed/direction at zero when mode is 0', () => {
    const result = rgbLEDReport({
      mode: 0,
      brightness: 5,
      speed: 3,
      direction: 1,
      colorful: 1,
      color: 0x112233,
    })

    expect(result[3]).toBe(0)
    expect(result[4]).toBe(0)
    expect(result[11]).toBe(0)
    expect(result[12]).toBe(0)
    expect(result[31]).toBe(20) // checksum
  })
})

describe('keyResponseReport', () => {
  it('encodes response level, fn switch, sleep time, and footer', () => {
    const result = keyResponseReport({ responseLevel: 4, fnSwitch: 1, sleepTime: 2 })

    expect(result).toHaveLength(32)
    expect(result[0]).toBe(0x07)
    expect(result[1]).toBe(0x10)
    expect(result[4]).toBe(1)
    expect(result[5]).toBe(1)
    expect(result[6]).toBe(1)
    expect(result[7]).toBe(1)
    expect(result[8]).toBe(1) // fnSwitch
    expect(result[9]).toBe(2) // sleepTime
    expect(result[11]).toBe(4) // responseLevel
    expect(result[17]).toBe(0xaa)
    expect(result[18]).toBe(0x55)
    expect(result[31]).toBe(33) // checksum
  })
})

describe('gameModeReport', () => {
  it('extends a key response report with game mode toggles', () => {
    const result = gameModeReport({
      responseLevel: 4,
      fnSwitch: 1,
      sleepTime: 2,
      gameMode: 1,
      disableAltTab: 1,
      disableAltF4: 0,
      disableWin: 1,
    })

    expect(result).toHaveLength(32)
    expect(result[11]).toBe(4) // responseLevel carried over
    expect(result[12]).toBe(1) // gameMode
    expect(result[13]).toBe(1) // disableAltTab
    expect(result[14]).toBe(0) // disableAltF4
    expect(result[15]).toBe(1) // disableWin
    expect(result[31]).toBe(36) // checksum
  })
})

describe('batteryQuery', () => {
  it('builds a report-ID-less query with opcode at byte 0 and checksum at the last byte', () => {
    const result = batteryQuery({ includeReportID: false, length: 32 })

    expect(result).toHaveLength(32)
    expect(result[0]).toBe(0x20)
    expect(result[1]).toBe(0x01)
    expect(result[31]).toBe(33) // checksum
  })

  it('shifts opcode and checksum by one byte when a report ID prefix is included', () => {
    const result = batteryQuery({ includeReportID: true, length: 33 })

    expect(result).toHaveLength(33)
    expect(result[0]).toBe(0x00)
    expect(result[1]).toBe(0x20)
    expect(result[2]).toBe(0x01)
    expect(result[32]).toBe(33) // checksum
  })

  it('returns an empty payload without erroring when length is 0', () => {
    const result = batteryQuery({ includeReportID: false, length: 0 })

    expect(result).toHaveLength(0)
  })
})
