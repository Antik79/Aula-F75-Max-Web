import { describe, expect, it, vi } from 'vitest'
import { DongleAulaDevice } from '@/lib/webhid/dongleDevice'
import { FakeHidPort } from './fakeHidPort'

describe('DongleAulaDevice.applyRGB', () => {
  it('sends a commit report, waits 50ms, then sends the clamped LED report', async () => {
    vi.useFakeTimers()
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    const applyPromise = device.applyRGB({
      mode: 99, // out of range, should clamp to 31
      brightness: 5,
      speed: 3,
      direction: 1,
      colorful: true,
      color: 0x112233,
    })
    await vi.advanceTimersByTimeAsync(50)
    await applyPromise

    expect(port.sentReports).toHaveLength(2)
    expect(port.sentReports[0].data[0]).toBe(0x0f) // commit report opcode
    expect(port.sentReports[1].data[0]).toBe(0x05) // LED report opcode
    expect(port.sentReports[1].data[3]).toBe(31) // mode clamped to max
    vi.useRealTimers()
  })
})

describe('DongleAulaDevice.applyPerformance', () => {
  it('sends a clamped key response report', async () => {
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    await device.applyPerformance({ level: 0, sleepTime: 9 }) // both out of range

    expect(port.sentReports).toHaveLength(1)
    expect(port.sentReports[0].data[0]).toBe(0x07)
    expect(port.sentReports[0].data[11]).toBe(1) // responseLevel clamped to min 1
    expect(port.sentReports[0].data[9]).toBe(3) // sleepTime clamped to max 3
    // fnSwitch=1 on a plain performance update is suspected of triggering
    // Game Mode-like behavior on the device (confirmed on real hardware:
    // response-rate changes alone light up the Windows-key-block LED).
    // Sending 0 here is the experiment to confirm/rule that out.
    expect(port.sentReports[0].data[8]).toBe(0)
  })

  it('zeroes bytes 4-7 as a second experiment, with a correctly recomputed checksum', async () => {
    // fnSwitch=0 alone didn't stop the Windows-key-lock side effect on real
    // hardware. Bytes 4-7 are the only other flag-shaped bytes hardcoded to
    // 1 in every performance-family packet, enable or disable — testing
    // whether zeroing them does. The checksum MUST be recomputed after
    // changing them or the device would likely reject the whole packet.
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    await device.applyPerformance({ level: 1, sleepTime: 3 })

    const bytes = port.sentReports[0].data
    expect([...bytes.slice(4, 8)]).toEqual([0, 0, 0, 0])
    // Sum of all other non-zero bytes: opcode(7) + subcommand(0x10=16) +
    // sleepTime(3) + responseLevel(1) + footer(0xaa=170, 0x55=85) = 282,
    // mod 256 = 26.
    expect(bytes[31]).toBe(26)
  })
})

describe('DongleAulaDevice.setGameMode', () => {
  it('sends a game mode report with all toggles matching the enabled flag', async () => {
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    await device.setGameMode({ enabled: true, level: 3, sleepTime: 1 })

    expect(port.sentReports).toHaveLength(1)
    const bytes = port.sentReports[0].data
    expect(bytes[12]).toBe(1) // gameMode
    expect(bytes[13]).toBe(1) // disableAltTab
    expect(bytes[14]).toBe(1) // disableAltF4
    expect(bytes[15]).toBe(1) // disableWin
  })
})

describe('DongleAulaDevice.queryBattery', () => {
  it('returns the percent parsed from the first matching input report ack', async () => {
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    const queryPromise = device.queryBattery()
    // Give the first sendOutputReport a moment to fire, then answer with an ack.
    await Promise.resolve()
    await Promise.resolve()
    port.dispatchInputReport(new Uint8Array([0x20, 0x01, 0x00, 77]))

    await expect(queryPromise).resolves.toBe(77)
  })

  it('resolves null if no endpoint ever acks', async () => {
    vi.useFakeTimers()
    const port = new FakeHidPort()
    const device = new DongleAulaDevice(port)

    const queryPromise = device.queryBattery()
    await vi.runAllTimersAsync()

    await expect(queryPromise).resolves.toBeNull()
    vi.useRealTimers()
  })
})
