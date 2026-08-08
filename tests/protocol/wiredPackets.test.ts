import { describe, expect, it } from 'vitest'
import { packet, timePayload } from '@/lib/protocol/wiredPackets'
import { AulaConstants } from '@/lib/protocol/constants'

describe('packet', () => {
  it('builds a 64-byte command with the opcode in the first two bytes', () => {
    const result = packet(0x04, 0x18)

    expect(result).toHaveLength(AulaConstants.commandLength)
    expect(result[0]).toBe(0x04)
    expect(result[1]).toBe(0x18)
    expect(result.slice(2).every((b) => b === 0)).toBe(true)
  })
})

describe('timePayload', () => {
  it('encodes the sub-command header, date fields, and footer at fixed offsets', () => {
    // 2024-03-15 09:05:03 was a Friday.
    const date = new Date(2024, 2, 15, 9, 5, 3)

    const result = timePayload(date)

    expect(result).toHaveLength(AulaConstants.commandLength)
    expect(result[0]).toBe(0x00)
    expect(result[1]).toBe(0x01)
    expect(result[2]).toBe(0x5a)
    expect(result[3]).toBe(0x1a)
    expect(result[4]).toBe(3) // month, 1-indexed
    expect(result[5]).toBe(15) // day
    expect(result[6]).toBe(9) // hour
    expect(result[7]).toBe(5) // minute
    expect(result[8]).toBe(3) // second
    expect(result[10]).toBe(5) // weekday, 0-indexed Sunday, Friday=5
    expect(result[62]).toBe(0xaa)
    expect(result[63]).toBe(0x55)
  })
})
