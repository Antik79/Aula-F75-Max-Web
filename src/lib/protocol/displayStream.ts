import { AulaConstants } from './constants'

export function secondsToDeviceDelay(seconds: number): number {
  const normalized = seconds <= 0 ? 0.01 : seconds
  const value = Math.round(normalized * 500)
  return Math.max(1, Math.min(255, value))
}

export function encodeRgb565(rgba: Uint8Array): Uint8Array {
  const pixelCount = rgba.length / 4
  const out = new Uint8Array(pixelCount * 2)
  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4
    const red = rgba[base] >> 3
    const green = rgba[base + 1] >> 2
    const blue = rgba[base + 2] >> 3
    const pixel = (red << 11) | (green << 5) | blue
    out[i * 2] = pixel & 0xff
    out[i * 2 + 1] = (pixel >> 8) & 0xff
  }
  return out
}

export function buildDisplayHeader(frameCount: number, delayBytes: number[]): Uint8Array {
  const header = new Uint8Array(AulaConstants.headerLength)
  header[0] = frameCount
  for (let i = 0; i < delayBytes.length; i++) {
    header[1 + i] = delayBytes[i]
  }
  return header
}

export interface DisplayFrame {
  rgba: Uint8Array
  delaySeconds: number
}

export interface EncodedDisplayStream {
  data: Uint8Array
  frameCount: number
  chunkCount: number
}

export function encodeDisplayStream(frames: DisplayFrame[]): EncodedDisplayStream {
  const frameCount = Math.min(frames.length, AulaConstants.maxFrames)
  const payloadLength = AulaConstants.headerLength + frameCount * AulaConstants.frameBytes
  const chunkCount = Math.ceil(payloadLength / AulaConstants.chunkLength)
  const data = new Uint8Array(chunkCount * AulaConstants.chunkLength)

  const delayBytes = frames.slice(0, frameCount).map((frame) => secondsToDeviceDelay(frame.delaySeconds))
  data.set(buildDisplayHeader(frameCount, delayBytes), 0)

  for (let i = 0; i < frameCount; i++) {
    const encoded = encodeRgb565(frames[i].rgba)
    data.set(encoded, AulaConstants.headerLength + i * AulaConstants.frameBytes)
  }

  return { data, frameCount, chunkCount }
}
