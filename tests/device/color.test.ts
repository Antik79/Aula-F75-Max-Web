import { describe, expect, it } from 'vitest'
import { hexToDeviceColor } from '@/lib/device/color'

describe('hexToDeviceColor', () => {
  // Confirmed against real hardware: the device reads the RGB report's color
  // bytes as [R, G, B] directly (byte4=R, byte5=G, byte6=B), not as a
  // little-endian R<<16|G<<8|B integer — picking red previously lit the
  // keyboard blue because R and B landed in the swapped bytes.
  it('puts red in the low byte so it lands in byte4', () => {
    expect(hexToDeviceColor('#ff0000') & 0xff).toBe(0xff)
  })

  it('puts blue in the high byte so it lands in byte6', () => {
    expect((hexToDeviceColor('#0000ff') >> 16) & 0xff).toBe(0xff)
  })

  it('keeps green in the middle byte', () => {
    expect((hexToDeviceColor('#00ff00') >> 8) & 0xff).toBe(0xff)
  })

  it('round-trips an arbitrary color through all three channels', () => {
    const value = hexToDeviceColor('#112233')
    expect(value & 0xff).toBe(0x11)
    expect((value >> 8) & 0xff).toBe(0x22)
    expect((value >> 16) & 0xff).toBe(0x33)
  })
})
