import type { AulaWiredDevice, DisplayUploadProgress } from '@/lib/device/types'
import { AulaConstants } from '@/lib/protocol'
import { delay } from '@/lib/timing'

const FACTORY_RESET_STAGES = [
  'Clearing display memory',
  'Resetting keymap and macro data',
  'Resetting lighting data',
  'Sending reset footer',
  'Resetting display config',
]

const MOCK_STEP_DELAY_MS = 10

export interface MockWiredState {
  lastSyncedAt: Date | null
  lastUploadedSlot: number | null
  lastUploadChunkCount: number | null
  resetCount: number
}

export class MockWiredDevice implements AulaWiredDevice {
  private lastSyncedAt: Date | null = null
  private lastUploadedSlot: number | null = null
  private lastUploadChunkCount: number | null = null
  private resetCount = 0

  async syncTime(date: Date = new Date()): Promise<void> {
    await delay(MOCK_STEP_DELAY_MS)
    this.lastSyncedAt = date
  }

  async uploadDisplayStream(
    stream: Uint8Array,
    slot: number,
    onProgress: (progress: DisplayUploadProgress) => void,
  ): Promise<void> {
    const chunkCount = Math.floor(stream.length / AulaConstants.chunkLength)
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      await delay(MOCK_STEP_DELAY_MS)
      onProgress({ sentChunks: chunkIndex + 1, totalChunks: chunkCount })
    }
    this.lastUploadedSlot = slot
    this.lastUploadChunkCount = chunkCount
  }

  async factoryReset(onProgress: (step: string) => void): Promise<void> {
    for (const stage of FACTORY_RESET_STAGES) {
      await delay(MOCK_STEP_DELAY_MS)
      onProgress(stage)
    }
    this.resetCount += 1
  }

  getState(): MockWiredState {
    return {
      lastSyncedAt: this.lastSyncedAt,
      lastUploadedSlot: this.lastUploadedSlot,
      lastUploadChunkCount: this.lastUploadChunkCount,
      resetCount: this.resetCount,
    }
  }
}
