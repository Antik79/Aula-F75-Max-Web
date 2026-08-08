import { describe, expect, it } from 'vitest'
import {
  batteryQuery,
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
  it('encodes response level, sleep time, fn switch, and footer, with bytes 4-7 and 12 zero when no restriction is active', () => {
    const result = keyResponseReport({
      responseLevel: 4,
      sleepTime: 2,
      disableWin: 0,
      disableAltF4: 0,
      disableAltTab: 0,
    })

    expect(result).toHaveLength(32)
    expect(result[0]).toBe(0x07)
    expect(result[1]).toBe(0x10)
    expect([...result.slice(4, 8)]).toEqual([0, 0, 0, 0])
    expect(result[8]).toBe(1) // fnSwitch, standardized at 1
    expect(result[9]).toBe(2) // sleepTime
    expect(result[11]).toBe(4) // responseLevel
    expect(result[12]).toBe(0) // aggregate: no disable flags set
    expect(result[13]).toBe(0) // disableAltTab
    expect(result[14]).toBe(0) // disableAltF4
    expect(result[15]).toBe(0) // disableWin
    expect(result[17]).toBe(0xaa)
    expect(result[18]).toBe(0x55)
    expect(result[31]).toBe(29) // checksum
  })

  it('sets bytes 4-7 and byte 12 to 1 whenever any disable flag is on', () => {
    // Bytes 4-7 turned out to be the actual lock mechanism, not bytes 12-15.
    // The original reference implementation hardcoded bytes 4-7 to 1 for
    // every performance-family packet: that's why enabling a restriction
    // worked but disabling it never reliably cleared the lock (bytes 4-7
    // stayed 1 regardless of the 12-15 flags), and why a plain response-rate
    // change alone spuriously triggered the lock too (same reason). Bytes
    // 12-15 appear to have no vendor-UI equivalent and may be decorative;
    // bytes 4-7 now track the same "any restriction active" aggregate as
    // byte 12, present only when a restriction is actually requested.
    const result = keyResponseReport({
      responseLevel: 4,
      sleepTime: 2,
      disableWin: 1,
      disableAltF4: 0,
      disableAltTab: 1,
    })

    expect([...result.slice(4, 8)]).toEqual([1, 1, 1, 1])
    expect(result[12]).toBe(1) // aggregate
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
