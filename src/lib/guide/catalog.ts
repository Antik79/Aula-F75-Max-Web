/**
 * Offline Fn-shortcut reference for the F75 Max. Ported (English only) from
 * upstream Aula-F75-Max-Driver's docs/keyboard-guide/catalog.json, which was
 * checked against page 2 of the EPOMAKER AULA F75 MAX manual.
 *
 * Deliberate omissions carried over from upstream: the manual prints both
 * animation-speed directions as Fn + →, so neither is listed until confirmed
 * on hardware. Pairing entries describe the documented 3-second hold, not an
 * inferred short press.
 */

export type GuideMode = 'windows' | 'mac'

export interface GuideRow {
  /** Keys pressed together, as printed on the keycaps. */
  keys: string[]
  action: string
  /** 'all' rows show in both modes; others only in the matching mode. */
  mode: GuideMode | 'all'
  /** Hold for 3 seconds rather than tap. */
  hold: boolean
}

export interface GuideGroup {
  id: string
  title: string
  note: string
  rows: GuideRow[]
}

export const MANUAL_URL = 'https://epomaker.com/cdn/shop/files/EPOMAKER_AULA_F75_MAX_manual.pdf'

const all = (keys: string[], action: string, hold = false): GuideRow => ({ keys, action, mode: 'all', hold })

const WINDOWS_F_ROW = [
  'Open browser',
  'Open mail',
  'Switch between tasks',
  'Open file explorer',
  'Decrease backlight brightness',
  'Increase backlight brightness',
  'Previous track',
  'Play / pause',
  'Next track',
  'Mute sound',
  'Decrease volume',
  'Increase volume',
]

const MAC_F_ROW = [
  'Decrease screen brightness',
  'Increase screen brightness',
  'Switch between tasks',
  'Show desktop',
  'Decrease backlight brightness',
  'Increase backlight brightness',
  'Previous track',
  'Play / pause',
  'Next track',
  'Mute sound',
  'Decrease volume',
  'Increase volume',
]

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'connections',
    title: 'Connection & pairing',
    note: 'Set the physical switch to Bluetooth or 2.4G before pairing.',
    rows: [
      all(['Fn', '1'], 'Pair Bluetooth device 1', true),
      all(['Fn', '2'], 'Pair Bluetooth device 2', true),
      all(['Fn', '3'], 'Pair Bluetooth device 3', true),
      all(['Fn', '`'], 'Pair the 2.4G receiver', true),
    ],
  },
  {
    id: 'lighting',
    title: 'Backlight',
    note: 'Change the lighting directly on the keyboard.',
    rows: [
      all(['Fn', '↑'], 'Increase backlight brightness'),
      all(['Fn', '↓'], 'Decrease backlight brightness'),
      all(['Fn', '\\'], 'Next backlight effect'),
      all(['Fn', 'Tab'], 'Next backlight colour'),
    ],
  },
  {
    id: 'media',
    title: 'Music, volume & function keys',
    note: 'In Windows mode, use Fn for media controls. In Mac mode, F1–F12 act directly; hold Fn for standard F keys.',
    rows: [
      ...WINDOWS_F_ROW.map((action, i): GuideRow => ({ keys: ['Fn', `F${i + 1}`], action, mode: 'windows', hold: false })),
      ...MAC_F_ROW.map((action, i): GuideRow => ({ keys: [`F${i + 1}`], action, mode: 'mac', hold: false })),
    ],
  },
  {
    id: 'extra',
    title: 'Additional keys',
    note: 'Access keys that have no dedicated button on this layout.',
    rows: [
      all(['Fn', 'Del'], 'Insert'),
      all(['Fn', 'End'], 'Home'),
      all(['Fn', 'U'], 'Print Screen'),
      all(['Fn', 'I'], 'Scroll Lock'),
      all(['Fn', 'O'], 'Pause'),
      all(['Fn', 'Win'], 'Lock Windows key'),
    ],
  },
  {
    id: 'knob',
    title: 'Screen & knob',
    note: 'Use the knob to control the keyboard screen or volume.',
    rows: [all(['Fn', 'Knob'], 'Switch knob control between screen and volume')],
  },
  {
    id: 'reset',
    title: 'Factory reset',
    note: 'Resets keyboard settings to factory defaults. Your custom settings will be lost.',
    rows: [all(['Fn', 'Esc'], 'Reset keyboard settings', true)],
  },
]

export function rowsForMode(group: GuideGroup, mode: GuideMode): GuideRow[] {
  return group.rows.filter((row) => row.mode === 'all' || row.mode === mode)
}
