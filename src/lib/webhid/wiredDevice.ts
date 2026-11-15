import { AulaConstants, packet, timePayload } from '@/lib/protocol'
import type { AulaWiredDevice, DisplayUploadProgress } from '@/lib/device/types'
import { commandExchange, sendFeatureReport, sendOutputReport, waitForInputReport, type HidPort } from './hidPort'
import { delay } from '@/lib/timing'
import { logActivity } from '@/lib/activity/log'

export type { DisplayUploadProgress }

export interface WiredAulaDeviceOptions {
  commandPort: HidPort
  rawPort: HidPort
}

const RAW_ACK_TIMEOUT_METADATA_MS = 150
const RAW_ACK_TIMEOUT_CHUNK_MS = 350
const ZERO_PAGE_DELAY_MS = 40

export class WiredAulaDevice implements AulaWiredDevice {
  private readonly commandPort: HidPort
  private readonly rawPort: HidPort

  constructor(options: WiredAulaDeviceOptions) {
    this.commandPort = options.commandPort
    this.rawPort = options.rawPort
  }

  async syncTime(date: Date = new Date()): Promise<void> {
    await commandExchange(this.commandPort, packet(0x04, 0x18))

    const prepare = packet(0x04, 0x28)
    prepare[8] = 0x01
    await commandExchange(this.commandPort, prepare)

    await commandExchange(this.commandPort, timePayload(date))
    await commandExchange(this.commandPort, packet(0x04, 0x02))
  }

  async uploadDisplayStream(
    stream: Uint8Array,
    slot: number,
    onProgress: (progress: DisplayUploadProgress) => void,
  ): Promise<void> {
    if (slot < 1 || slot > 255) {
      throw new RangeError('slot must be between 1 and 255')
    }

    const chunkCount = Math.floor(stream.length / AulaConstants.chunkLength)
    if (chunkCount > 0xffff) {
      throw new RangeError(`${chunkCount} chunks exceeds the 16-bit chunk count field`)
    }

    await commandExchange(this.commandPort, packet(0x04, 0x18))

    const metadata = packet(0x04, 0x72)
    metadata[2] = slot
    metadata[8] = chunkCount & 0xff
    metadata[9] = (chunkCount >> 8) & 0xff
    await commandExchange(this.commandPort, metadata)
    if (!(await waitForInputReport(this.rawPort, RAW_ACK_TIMEOUT_METADATA_MS))) {
      logActivity('wired', 'info', `Display metadata: no ack within ${RAW_ACK_TIMEOUT_METADATA_MS} ms, continuing`)
    }

    let missedAcks = 0
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      const offset = chunkIndex * AulaConstants.chunkLength
      const chunk = stream.subarray(offset, offset + AulaConstants.chunkLength)
      await sendOutputReport(this.rawPort, chunk)
      if (!(await waitForInputReport(this.rawPort, RAW_ACK_TIMEOUT_CHUNK_MS))) missedAcks++
      onProgress({ sentChunks: chunkIndex + 1, totalChunks: chunkCount })
    }
    if (missedAcks > 0) {
      logActivity('wired', 'warn', `${missedAcks}/${chunkCount} display chunks got no ack within ${RAW_ACK_TIMEOUT_CHUNK_MS} ms`)
    }

    await commandExchange(this.commandPort, packet(0x04, 0x02))
  }

  async factoryReset(onProgress: (step: string) => void): Promise<void> {
    onProgress('Clearing display memory')
    await commandExchange(this.commandPort, packet(0x04, 0x19))
    const clearSlots = packet(0x04, 0x15)
    clearSlots[8] = 0x08
    await commandExchange(this.commandPort, clearSlots)
    await this.sendZeroPages(8)
    await commandExchange(this.commandPort, packet(0x04, 0x02))

    onProgress('Resetting keymap and macro data')
    await commandExchange(this.commandPort, packet(0x04, 0x18))
    const keymap = packet(0x04, 0x11)
    keymap[8] = 0x09
    await commandExchange(this.commandPort, keymap)
    await this.sendZeroPages(9)
    await commandExchange(this.commandPort, packet(0x04, 0x02))
    await commandExchange(this.commandPort, packet(0x04, 0xf0))

    onProgress('Resetting lighting data')
    await commandExchange(this.commandPort, packet(0x04, 0x18))
    const lighting = packet(0x04, 0x27)
    lighting[8] = 0x09
    await commandExchange(this.commandPort, lighting)
    await this.sendZeroPages(9)
    await commandExchange(this.commandPort, packet(0x04, 0x02))
    await commandExchange(this.commandPort, packet(0x04, 0xf0))

    onProgress('Sending reset footer')
    await commandExchange(this.commandPort, packet(0x04, 0x18))
    const resetPayloadHeader = packet(0x04, 0x13)
    resetPayloadHeader[8] = 0x01
    await commandExchange(this.commandPort, resetPayloadHeader)

    const resetPayload = new Uint8Array(AulaConstants.commandLength)
    resetPayload[0] = 0x0b
    resetPayload[1] = 0xff
    resetPayload[8] = 0x01
    resetPayload[9] = 0x05
    resetPayload[10] = 0x03
    resetPayload[14] = 0xaa
    resetPayload[15] = 0x55
    await commandExchange(this.commandPort, resetPayload)
    await commandExchange(this.commandPort, packet(0x04, 0x02))
    await commandExchange(this.commandPort, packet(0x04, 0xf0))

    onProgress('Resetting display config')
    await commandExchange(this.commandPort, packet(0x04, 0x18))
    const displayReset = packet(0x04, 0x17)
    displayReset[2] = 0x01
    displayReset[8] = 0x01
    await commandExchange(this.commandPort, displayReset)

    const displayConfig = new Uint8Array(AulaConstants.commandLength)
    displayConfig[0] = 0x00
    displayConfig[1] = 0x01
    displayConfig[6] = 0x02
    displayConfig[8] = 0x02
    await commandExchange(this.commandPort, displayConfig)
    await commandExchange(this.commandPort, packet(0x04, 0x02))
  }

  private async sendZeroPages(count: number): Promise<void> {
    if (count <= 0) return
    const zero = new Uint8Array(AulaConstants.commandLength)
    for (let i = 0; i < count - 1; i++) {
      await sendFeatureReport(this.commandPort, zero)
      await delay(ZERO_PAGE_DELAY_MS)
    }
    await commandExchange(this.commandPort, zero)
  }
}
