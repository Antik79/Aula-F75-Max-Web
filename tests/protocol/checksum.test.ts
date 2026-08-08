import { describe, expect, it } from 'vitest'
import { applyChecksum } from '@/lib/protocol/checksum'

describe('applyChecksum', () => {
  it('writes the sum of the other bytes into the checksum index', () => {
    const bytes = new Uint8Array([1, 2, 3, 0])

    applyChecksum(bytes, 3)

    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 6]))
  })

  it('zeroes the checksum byte before summing, ignoring its previous value', () => {
    const bytes = new Uint8Array([1, 2, 3, 200])

    applyChecksum(bytes, 3)

    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 6]))
  })

  it('wraps the sum modulo 256', () => {
    const bytes = new Uint8Array([255, 255, 0])

    applyChecksum(bytes, 2)

    expect(bytes[2]).toBe((255 + 255) % 256)
  })

  it('does nothing when the checksum index is out of range', () => {
    const bytes = new Uint8Array([1, 2, 3])

    applyChecksum(bytes, 10)

    expect(bytes).toEqual(new Uint8Array([1, 2, 3]))
  })
})
