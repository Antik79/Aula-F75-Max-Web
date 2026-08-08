export function applyChecksum(bytes: Uint8Array, checksumIndex: number): void {
  if (checksumIndex < 0 || checksumIndex >= bytes.length) return

  bytes[checksumIndex] = 0
  let sum = 0
  for (const byte of bytes) {
    sum += byte
  }
  bytes[checksumIndex] = sum & 0xff
}
