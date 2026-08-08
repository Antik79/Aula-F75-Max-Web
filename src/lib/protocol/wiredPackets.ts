import { AulaConstants } from './constants'

export function packet(first: number, second: number): Uint8Array {
  const data = new Uint8Array(AulaConstants.commandLength)
  data[0] = first
  data[1] = second
  return data
}

export function timePayload(date: Date = new Date()): Uint8Array {
  const payload = new Uint8Array(AulaConstants.commandLength)
  payload[0] = 0x00
  payload[1] = 0x01
  payload[2] = 0x5a
  payload[3] = 0x1a
  payload[4] = date.getMonth() + 1
  payload[5] = date.getDate()
  payload[6] = date.getHours()
  payload[7] = date.getMinutes()
  payload[8] = date.getSeconds()
  payload[10] = date.getDay()
  payload[62] = 0xaa
  payload[63] = 0x55
  return payload
}
