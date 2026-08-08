import { describe, expect, it, vi } from 'vitest'
import { MockWiredDevice } from '@/lib/mock/mockWiredDevice'
import { AulaConstants } from '@/lib/protocol'

describe('MockWiredDevice.syncTime', () => {
  it('records the synced date', async () => {
    const device = new MockWiredDevice()
    const date = new Date(2024, 2, 15, 9, 5, 3)

    await device.syncTime(date)

    expect(device.getState().lastSyncedAt).toEqual(date)
  })
})

describe('MockWiredDevice.uploadDisplayStream', () => {
  it('reports progress once per chunk and records the slot', async () => {
    vi.useFakeTimers()
    const device = new MockWiredDevice()
    const stream = new Uint8Array(AulaConstants.chunkLength * 3)
    const progress: { sentChunks: number; totalChunks: number }[] = []

    const uploadPromise = device.uploadDisplayStream(stream, 5, (p) => progress.push(p))
    await vi.runAllTimersAsync()
    await uploadPromise

    expect(progress).toEqual([
      { sentChunks: 1, totalChunks: 3 },
      { sentChunks: 2, totalChunks: 3 },
      { sentChunks: 3, totalChunks: 3 },
    ])
    expect(device.getState().lastUploadedSlot).toBe(5)
    vi.useRealTimers()
  })
})

describe('MockWiredDevice.factoryReset', () => {
  it('reports each reset stage in order', async () => {
    vi.useFakeTimers()
    const device = new MockWiredDevice()
    const steps: string[] = []

    const resetPromise = device.factoryReset((step) => steps.push(step))
    await vi.runAllTimersAsync()
    await resetPromise

    expect(steps).toEqual([
      'Clearing display memory',
      'Resetting keymap and macro data',
      'Resetting lighting data',
      'Sending reset footer',
      'Resetting display config',
    ])
    vi.useRealTimers()
  })
})
