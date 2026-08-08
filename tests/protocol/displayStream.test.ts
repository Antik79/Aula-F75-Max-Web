import { describe, expect, it } from 'vitest'
import {
  buildDisplayHeader,
  encodeDisplayStream,
  encodeRgb565,
  secondsToDeviceDelay,
} from '@/lib/protocol/displayStream'
import { AulaConstants } from '@/lib/protocol/constants'

describe('secondsToDeviceDelay', () => {
  it('converts seconds to device delay units at a 500-per-second rate', () => {
    expect(secondsToDeviceDelay(0.1)).toBe(50)
  })

  it('clamps to 255 for long delays', () => {
    expect(secondsToDeviceDelay(1.0)).toBe(255)
  })

  it('clamps to a minimum of 1 for very short delays', () => {
    expect(secondsToDeviceDelay(0.001)).toBe(1)
  })

  it('falls back to a 0.01s floor for zero or negative delays', () => {
    expect(secondsToDeviceDelay(0)).toBe(5)
    expect(secondsToDeviceDelay(-1)).toBe(5)
  })
})

describe('encodeRgb565', () => {
  it('packs a pure red pixel into the high 5 bits', () => {
    const rgba = new Uint8Array([0xff, 0x00, 0x00, 0xff])
    expect(encodeRgb565(rgba)).toEqual(new Uint8Array([0x00, 0xf8]))
  })

  it('packs a pure green pixel into the middle 6 bits', () => {
    const rgba = new Uint8Array([0x00, 0xff, 0x00, 0xff])
    expect(encodeRgb565(rgba)).toEqual(new Uint8Array([0xe0, 0x07]))
  })

  it('packs a pure blue pixel into the low 5 bits', () => {
    const rgba = new Uint8Array([0x00, 0x00, 0xff, 0xff])
    expect(encodeRgb565(rgba)).toEqual(new Uint8Array([0x1f, 0x00]))
  })

  it('encodes multiple pixels in order, ignoring alpha', () => {
    const rgba = new Uint8Array([0xff, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x00])
    expect(encodeRgb565(rgba)).toEqual(new Uint8Array([0x00, 0xf8, 0x1f, 0x00]))
  })
})

describe('buildDisplayHeader', () => {
  it('writes frame count then one delay byte per frame, zero-padded to headerLength', () => {
    const header = buildDisplayHeader(2, [50, 80])

    expect(header).toHaveLength(AulaConstants.headerLength)
    expect(header[0]).toBe(2)
    expect(header[1]).toBe(50)
    expect(header[2]).toBe(80)
    expect(header.slice(3).every((b) => b === 0)).toBe(true)
  })
})

describe('encodeDisplayStream', () => {
  it('lays out header + per-frame RGB565 data, padded to a chunk boundary', () => {
    const pixelCount = AulaConstants.displayWidth * AulaConstants.displayHeight
    const frameRgba = new Uint8Array(pixelCount * 4)
    // Fill every pixel pure red so the encoded frame is predictable.
    for (let i = 0; i < pixelCount; i++) {
      frameRgba[i * 4] = 0xff
      frameRgba[i * 4 + 3] = 0xff
    }

    const result = encodeDisplayStream([{ rgba: frameRgba, delaySeconds: 0.1 }])

    expect(result.frameCount).toBe(1)
    const payloadLength = AulaConstants.headerLength + AulaConstants.frameBytes
    const expectedChunkCount = Math.ceil(payloadLength / AulaConstants.chunkLength)
    expect(result.chunkCount).toBe(expectedChunkCount)
    expect(result.data).toHaveLength(expectedChunkCount * AulaConstants.chunkLength)

    // Header
    expect(result.data[0]).toBe(1)
    expect(result.data[1]).toBe(50)

    // First pixel of frame 0, pure red -> [0x00, 0xf8]
    const frameStart = AulaConstants.headerLength
    expect(result.data[frameStart]).toBe(0x00)
    expect(result.data[frameStart + 1]).toBe(0xf8)
  })
})
