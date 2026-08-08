import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commandExchange, sendOutputReport, waitForInputReport } from '@/lib/webhid/hidPort'
import { FakeHidPort } from './fakeHidPort'

describe('commandExchange', () => {
  it('sends a feature report on report ID 0 then reads back the ack on report ID 0', async () => {
    const port = new FakeHidPort()
    const ackBytes = new Uint8Array([1, 2, 3])
    port.featureReportResponse = new DataView(ackBytes.buffer)
    const packet = new Uint8Array([0x04, 0x18])

    const ack = await commandExchange(port, packet)

    expect(port.sendFeatureReport).toHaveBeenCalledWith(0, packet)
    expect(port.receiveFeatureReport).toHaveBeenCalledWith(0)
    expect(ack).toBe(port.featureReportResponse)
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
