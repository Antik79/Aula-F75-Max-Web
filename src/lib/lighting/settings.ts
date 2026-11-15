/**
 * Everything the keyboard needs to show one lighting look. Shared by the live
 * preview, saved profiles and the RGB tab, so "what the user picked" and
 * "what a profile stores" can be compared with lightingSettingsEqual().
 */
export interface LightingSettings {
  /** Firmware effect id, 0–19 (see RGB_MODES). */
  mode: number
  /** 1 (dimmest) – 5 (brightest). */
  brightness: number
  /** 1 (slowest) – 5 (fastest). */
  speed: number
  /** 0 = right, 1 = down, 2 = left, 3 = up. */
  direction: number
  /** true = rainbow colours, false = the single colour below. */
  colorful: boolean
  /** The single colour as #rrggbb. */
  color: string
}

export function lightingSettingsEqual(a: LightingSettings, b: LightingSettings): boolean {
  return (
    a.mode === b.mode &&
    a.brightness === b.brightness &&
    a.speed === b.speed &&
    a.direction === b.direction &&
    a.colorful === b.colorful &&
    a.color.toLowerCase() === b.color.toLowerCase()
  )
}
