import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commandExchange, isReadyReply, sendFeatureReport, sendOutputReport, waitForInputReport } from '@/lib/webhid/hidPort'
import { FakeHidPort } from './fakeHidPort'

describe('commandExchange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const readyReply = (packet: Uint8Array, leadingReportId = false) => {
    const bytes = new Uint8Array(64)
    const offset = leadingReportId ? 1 : 0
    bytes[offset] = packet[0]
    bytes[offset + 1] = packet[1]
    bytes[offset + 3] = 0x01
    return new DataView(bytes.buffer)
  }

  it('sends a feature report on report ID 0 then reads back replies on report ID 0', async () => {
    const port = new FakeHidPort()
    const packet = new Uint8Array([0x04, 0x18])
    port.featureReportResponse = readyReply(packet)

    const exchange = commandExchange(port, packet)
    await vi.runAllTimersAsync()
    const ack = await exchange

    expect(port.sendFeatureReport).toHaveBeenCalledWith(0, packet)
    expect(port.receiveFeatureReport).toHaveBeenCalledWith(0)
    expect(ack).toBe(port.featureReportResponse)
  })

  it('stops polling as soon as the device echoes the header with the ready flag', async () => {
    const port = new FakeHidPort()
    const packet = new Uint8Array([0x04, 0x28])
    const busy = new DataView(new Uint8Array(64).buffer)
    port.receiveFeatureReport
      .mockResolvedValueOnce(busy)
      .mockResolvedValueOnce(busy)
      .mockResolvedValueOnce(readyReply(packet))

    const exchange = commandExchange(port, packet)
    await vi.runAllTimersAsync()
    await exchange

    expect(port.receiveFeatureReport).toHaveBeenCalledTimes(3)
  })

  it('returns the last reply after maxPolls when the ready flag never arrives (data packets)', async () => {
    const port = new FakeHidPort()
    const packet = new Uint8Array([0x00, 0x01, 0x02])

    const exchange = commandExchange(port, packet)
    await vi.runAllTimersAsync()
    const reply = await exchange

    expect(port.receiveFeatureReport).toHaveBeenCalledTimes(6)
    expect(port.sendFeatureReport).toHaveBeenCalledTimes(1)
    expect(reply).toBe(port.featureReportResponse)
  })

  it('retries the whole exchange after a transient failure', async () => {
    const port = new FakeHidPort()
    const packet = new Uint8Array([0x04, 0x02])
    port.featureReportResponse = readyReply(packet)
    port.sendFeatureReport.mockRejectedValueOnce(new Error('NotAllowedError')).mockRejectedValueOnce(new Error('x'))

    const exchange = commandExchange(port, packet)
    await vi.runAllTimersAsync()
    await exchange

    expect(port.sendFeatureReport).toHaveBeenCalledTimes(3)
  })

  it('throws the last error once every attempt has failed', async () => {
    const port = new FakeHidPort()
    port.sendFeatureReport.mockRejectedValue(new Error('device gone'))

    const exchange = commandExchange(port, new Uint8Array([0x04, 0xf0]))
    const assertion = expect(exchange).rejects.toThrow('device gone')
    await vi.runAllTimersAsync()
    await assertion

    expect(port.sendFeatureReport).toHaveBeenCalledTimes(6)
  })
})

describe('isReadyReply', () => {
  const packet = new Uint8Array([0x04, 0x18])

  it('accepts the echo at offset 0', () => {
    expect(isReadyReply(new DataView(new Uint8Array([0x04, 0x18, 0x00, 0x01]).buffer), packet)).toBe(true)
  })

  it('accepts the echo behind a leading report-ID 0 byte', () => {
    expect(isReadyReply(new DataView(new Uint8Array([0x00, 0x04, 0x18, 0x00, 0x01]).buffer), packet)).toBe(true)
  })

  it('rejects a reply without the ready flag or with a different header', () => {
    expect(isReadyReply(new DataView(new Uint8Array([0x04, 0x18, 0x00, 0x00]).buffer), packet)).toBe(false)
    expect(isReadyReply(new DataView(new Uint8Array([0x04, 0x28, 0x00, 0x01]).buffer), packet)).toBe(false)
    expect(isReadyReply(new DataView(new ArrayBuffer(0)), packet)).toBe(false)
  })
})

describe('sendFeatureReport', () => {
  it('retries a failed raw write', async () => {
    vi.useFakeTimers()
    const port = new FakeHidPort()
    port.sendFeatureReport.mockRejectedValueOnce(new Error('timeout'))

    const write = sendFeatureReport(port, new Uint8Array(64))
    await vi.runAllTimersAsync()
    await write

    expect(port.sendFeatureReport).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('sendOutputReport', () => {
  it('sends the bytes as an output report on report ID 0', async () => {
    const port = new FakeHidPort()
    const bytes = new Uint8Array(32)
    bytes[0] = 0x0f

    await sendOutputReport(port, bytes)

    expect(port.sendReport).toHaveBeenCalledWith(0, bytes)
  })
})

describe('waitForInputReport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the input report data when one arrives before the timeout', async () => {
    const port = new FakeHidPort()
    const promise = waitForInputReport(port, 250)

    port.dispatchInputReport(new Uint8Array([0x20, 0x01, 0x00, 42]))

    await expect(promise).resolves.toBeInstanceOf(DataView)
  })

  it('resolves null if no input report arrives before the timeout', async () => {
    const port = new FakeHidPort()
    const promise = waitForInputReport(port, 250)

    vi.advanceTimersByTime(250)

    await expect(promise).resolves.toBeNull()
  })
})
