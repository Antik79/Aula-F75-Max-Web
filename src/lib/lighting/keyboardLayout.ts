/**
 * The Aula F75 Max drawn as data. Ported from upstream Aula-F75-Max-Driver's
 * AulaCore/KeyboardLayout: a function row with the screen and knob at the
 * right, then a 75% block with a right-hand column and the arrow cluster set
 * slightly lower. All units are key units (1 = a normal key), measured from
 * the top-left corner of the key area.
 */

export type KeycapTone = 'light' | 'dark'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface KeyboardKey {
  id: string
  label: string
  frame: Rect
  row: number
  tone: KeycapTone
}

export interface KeyboardLayoutSpec {
  keys: KeyboardKey[]
  width: number
  height: number
  screenFrame: Rect
  knobCenter: { x: number; y: number }
  knobRadius: number
}

class RowBuilder {
  keys: KeyboardKey[] = []
  private x = 0
  private y = 0
  private row = 0
  yOffset = 0

  startRow(row: number, y: number) {
    this.row = row
    this.y = y
    this.x = 0
    this.yOffset = 0
  }

  skip(width: number) {
    this.x += width
  }

  add(label: string, options: { id?: string; width?: number; tone?: KeycapTone } = {}) {
    const width = options.width ?? 1
    this.keys.push({
      id: options.id ?? label,
      label,
      frame: { x: this.x, y: this.y + this.yOffset, width, height: 1 },
      row: this.row,
      tone: options.tone ?? (this.row <= 2 ? 'light' : 'dark'),
    })
    this.x += width
  }
}

function buildF75Max(): KeyboardLayoutSpec {
  const b = new RowBuilder()

  // Row 0: Esc, F1–F4, F5–F8, F9–F12 in groups with small gaps.
  b.startRow(0, 0)
  b.add('Esc')
  b.skip(0.25)
  for (let n = 1; n <= 4; n++) b.add(`F${n}`)
  b.skip(0.25)
  for (let n = 5; n <= 8; n++) b.add(`F${n}`)
  b.skip(0.25)
  for (let n = 9; n <= 12; n++) b.add(`F${n}`)

  // Row 1: number row.
  b.startRow(1, 1.25)
  for (const label of ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']) b.add(label)
  b.add('Backspace', { width: 2 })
  b.add('Del')

  b.startRow(2, 2.25)
  b.add('Tab', { width: 1.5 })
  for (const label of ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']']) b.add(label)
  b.add('\\', { width: 1.5 })
  b.add('PgUp')

  b.startRow(3, 3.25)
  b.add('Caps', { width: 1.75 })
  for (const label of ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"]) b.add(label)
  b.add('Enter', { width: 2.25, tone: 'light' })
  b.add('PgDn')

  b.startRow(4, 4.25)
  b.add('Shift', { id: 'LShift', width: 2.25 })
  for (const label of ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']) b.add(label)
  b.add('Shift', { id: 'RShift', width: 1.75 })
  b.add('↑', { id: 'Up' })
  b.add('End')

  // Row 5: modifiers, space, then the arrows set slightly lower.
  b.startRow(5, 5.25)
  b.add('Ctrl', { width: 1.25 })
  b.add('Win', { width: 1.25 })
  b.add('Alt', { id: 'LAlt', width: 1.25 })
  b.add('', { id: 'Space', width: 6.25 })
  b.add('Alt', { id: 'RAlt' })
  b.add('Fn')
  b.skip(1)
  b.yOffset = 0.12
  b.add('←', { id: 'Left' })
  b.add('↓', { id: 'Down' })
  b.add('→', { id: 'Right' })

  return {
    keys: b.keys,
    width: 16,
    height: 6.4,
    screenFrame: { x: 13.95, y: 0.05, width: 1.1, height: 0.9 },
    knobCenter: { x: 15.55, y: 0.5 },
    knobRadius: 0.42,
  }
}

export const F75_MAX_LAYOUT: KeyboardLayoutSpec = buildF75Max()

/** A key's centre normalised to 0–1 across the layout, as the renderer expects. */
export function normalizedCentre(key: KeyboardKey, layout: KeyboardLayoutSpec = F75_MAX_LAYOUT) {
  return {
    x: (key.frame.x + key.frame.width / 2) / layout.width,
    y: (key.frame.y + key.frame.height / 2) / layout.height,
  }
}
