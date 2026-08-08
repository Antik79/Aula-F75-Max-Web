export interface RgbMode {
  id: number
  title: string
}

export const RGB_MODES: RgbMode[] = [
  { id: 0, title: 'LED Off' },
  { id: 1, title: 'Static' },
  { id: 2, title: 'Single On' },
  { id: 3, title: 'Single Off' },
  { id: 4, title: 'Glittering' },
  { id: 5, title: 'Falling' },
  { id: 6, title: 'Colourful' },
  { id: 7, title: 'Breath' },
  { id: 8, title: 'Spectrum' },
  { id: 9, title: 'Outward' },
  { id: 10, title: 'Scrolling' },
  { id: 11, title: 'Rolling' },
  { id: 12, title: 'Rotating' },
  { id: 13, title: 'Explode' },
  { id: 14, title: 'Launch' },
  { id: 15, title: 'Ripples' },
  { id: 16, title: 'Flowing' },
  { id: 17, title: 'Pulsating' },
  { id: 18, title: 'Tilt' },
  { id: 19, title: 'Shuttle' },
]

export const DIRECTIONS = [
  { id: 0, title: 'Right' },
  { id: 1, title: 'Down' },
  { id: 2, title: 'Left' },
  { id: 3, title: 'Up' },
]

export const RESPONSE_LEVELS = [
  { id: 1, title: 'Level 1 · Fastest', detail: '5–6 ms' },
  { id: 2, title: 'Level 2 · Balanced', detail: '7–9 ms' },
  { id: 3, title: 'Level 3 · Stable', detail: '10–12 ms' },
  { id: 4, title: 'Level 4 · Conservative', detail: '15–17 ms' },
  { id: 5, title: 'Level 5 · Max stability', detail: '19–21 ms' },
]

export const SLEEP_TIMES = [
  { id: 0, title: 'No sleep' },
  { id: 1, title: '1 min' },
  { id: 2, title: '5 min' },
  { id: 3, title: '30 min' },
]
