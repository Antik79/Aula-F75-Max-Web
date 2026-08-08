import { describe, expect, it, vi } from 'vitest'
import { WiredAulaDevice } from '@/lib/webhid/wiredDevice'
import { AulaConstants } from '@/lib/protocol'
import { FakeHidPort } from './fakeHidPort'

describe('WiredAulaDevice.syncTime', () => {
  it('sends begin, prepare, time payload, and commit as feature reports in order', async () => {
    const commandPort = new FakeHidPort()
    const rawPort = new FakeHidPort()
    const device = new WiredAulaDevice({ commandPort, rawPort })
    const date = new Date(2024, 2, 15, 9, 5, 3) // Friday

    await device.syncTime(date)

    expect(commandPort.sentFeatureReports).toHaveLength(4)
    expect([...commandPort.sentFeatureReports[0].data.slice(0, 2)]).toEqual([0x04, 0x18])
    expect([...commandPort.sentFeatureReports[1].data.slice(0, 2)]).toEqual([0x04, 0x28])
    expect(commandPort.sentFeatureReports[1].data[8]).toBe(0x01)
    expect(commandPort.sentFeatureReports[2].data[4]).toBe(3) // month from timePayload
    expect(commandPort.sentFeatureReports[2].data[5]).toBe(15) // day
    expect([...commandPort.sentFeatureReports[3].data.slice(0, 2)]).toEqual([0x04, 0x02])
  })
})

describe('WiredAulaDevice.uploadDisplayStream', () => {
  it('sends metadata then each chunk as an output report, reporting progress after each', async () => {
    vi.useFakeTimers()
    const commandPort = new FakeHidPort()
    const rawPort = new FakeHidPort()
    const device = new WiredAulaDevice({ commandPort, rawPort })
    const stream = new Uint8Array(AulaConstants.chunkLength * 2)
    stream[0] = 0xaa
    stream[AulaConstants.chunkLength] = 0xbb
    const progress: { sentChunks: number; totalChunks: number }[] = []

    const uploadPromise = device.uploadDisplayStream(stream, 1, (p) => progress.push(p))
    await vi.runAllTimersAsync()
    await uploadPromise

    expect(commandPort.sentFeatureReports).toHaveLength(3) // begin, metadata, commit
    expect(commandPort.sentFeatureReports[1].data[1]).toBe(0x72)
    expect(commandPort.sentFeatureReports[1].data[2]).toBe(1) // slot
    expect(commandPort.sentFeatureReports[1].data[8]).toBe(2) // chunk count low byte

    expect(rawPort.sentReports).toHaveLength(2)
    expect(rawPort.sentReports[0].data[0]).toBe(0xaa)
    expect(rawPort.sentReports[1].data[0]).toBe(0xbb)

    expect(progress).toEqual([
      { sentChunks: 1, totalChunks: 2 },
      { sentChunks: 2, totalChunks: 2 },
    ])
    vi.useRealTimers()
  })

  it('rejects when the slot is outside 1-255', async () => {
    const commandPort = new FakeHidPort()
    const rawPort = new FakeHidPort()
    const device = new WiredAulaDevice({ commandPort, rawPort })

    await expect(device.uploadDisplayStream(new Uint8Array(0), 0, () => {})).rejects.toThrow()
  })
})

describe('WiredAulaDevice.factoryReset', () => {
  it('runs every reset stage in order and reports progress for each', async () => {
    vi.useFakeTimers()
    const commandPort = new FakeHidPort()
    const rawPort = new FakeHidPort()
    const device = new WiredAulaDevice({ commandPort, rawPort })
    const progress: string[] = []

    const resetPromise = device.factoryReset((step) => progress.push(step))
    await vi.runAllTimersAsync()
    await resetPromise

    expect(progress).toEqual([
      'Clearing display memory',
      'Resetting keymap and macro data',
      'Resetting lighting data',
      'Sending reset footer',
      'Resetting display config',
    ])

    const footerPacket = commandPort.sentFeatureReports.find((r) => r.data[0] === 0x0b && r.data[1] === 0xff)
    expect(footerPacket).toBeDefined()
    expect(footerPacket?.data[14]).toBe(0xaa)
    expect(footerPacket?.data[15]).toBe(0x55)

    // Zero-page writes (23 total across the three zeroed stages) skip the ack read.
    const rawWrites = commandPort.sendFeatureReport.mock.calls.length - commandPort.receiveFeatureReport.mock.calls.length
    expect(rawWrites).toBe(23)
    vi.useRealTimers()
  })
})
