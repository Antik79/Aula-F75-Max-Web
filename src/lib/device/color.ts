/**
 * Converts a #RRGGBB hex string into the integer rgbLEDReport() expects.
 * The device reads the report's color bytes as [R, G, B] in that direct
 * byte order, so this deliberately packs R into the low byte (not G/B —
 * confirmed against real hardware after picking red lit the keyboard blue).
 */
export function hexToDeviceColor(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r | (g << 8) | (b << 16)
}
