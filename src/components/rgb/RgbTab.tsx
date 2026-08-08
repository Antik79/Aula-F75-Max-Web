import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useConnection } from '@/state/connectionContext'
import { DIRECTIONS, RGB_MODES } from '@/lib/device/labels'
import { hexToDeviceColor } from '@/lib/device/color'
import { usePersistedState } from '@/hooks/usePersistedState'

const DEFAULT_COLOR = '#e0a458'

// Matches the vendor software's preset swatch row.
const PRESET_COLORS = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffffff']

export function RgbTab() {
  const { dongleDevice, setLiveAccent } = useConnection()
  const [mode, setMode] = usePersistedState('aula.rgb.mode', 1)
  const [color, setColor] = usePersistedState('aula.rgb.color', DEFAULT_COLOR)
  const [brightness, setBrightness] = usePersistedState('aula.rgb.brightness', 3)
  const [speed, setSpeed] = usePersistedState('aula.rgb.speed', 3)
  const [direction, setDirection] = usePersistedState('aula.rgb.direction', 0)
  const [colorful, setColorful] = usePersistedState('aula.rgb.colorful', false)
  const [applying, setApplying] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const apply = async (overrides: Partial<{ mode: number; color: string; brightness: number; speed: number; direction: number; colorful: boolean }> = {}) => {
    if (!dongleDevice) return
    const next = { mode, color, brightness, speed, direction, colorful, ...overrides }
    setApplying(true)
    try {
      await dongleDevice.applyRGB({
        mode: next.mode,
        brightness: next.brightness,
        speed: next.speed,
        direction: next.direction,
        colorful: next.colorful,
        color: hexToDeviceColor(next.color),
      })
      if (next.mode !== 0) setLiveAccent(next.color)
    } catch (error) {
      toast.error('Could not apply RGB settings', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setApplying(false)
    }
  }

  // There's no device command to read RGB settings back, so on load this only
  // has last-picked localStorage state. Push it into the shared live-accent
  // CSS var once on mount so the UI reflects it immediately instead of
  // showing DEFAULT_COLOR until the user next touches the color picker.
  useEffect(() => {
    if (mode !== 0) setLiveAccent(color)
    // Intentionally mount-only: this seeds the accent from persisted state
    // once, not on every color/mode change (apply() already handles that).
  }, [])

  // <input type="color">'s native "change" event fires reliably once the
  // picker is confirmed/closed. React's onChange normalizes to the native
  // "input" event instead, which some browsers also fire continuously while
  // the OS picker is open — so this is the actual commit signal, with
  // onBlur below as a fallback for browsers that don't fire it promptly.
  useEffect(() => {
    const el = colorInputRef.current
    if (!el) return
    const handleChange = (e: Event) => {
      void apply({ color: (e.target as HTMLInputElement).value })
    }
    el.addEventListener('change', handleChange)
    return () => el.removeEventListener('change', handleChange)
  })

  const showMovementControls = mode !== 0 && mode !== 1

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-muted-foreground uppercase">Effect</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {RGB_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id)
                void apply({ mode: m.id })
              }}
              className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                mode === m.id
                  ? 'border-live bg-live/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.title}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="rgb-color" className="font-mono text-xs text-muted-foreground uppercase">
          Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            id="rgb-color"
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={(e) => void apply({ color: e.target.value })}
            className="size-8 cursor-pointer rounded border border-border bg-transparent"
          />
          <span className="font-mono text-xs text-muted-foreground uppercase">{color}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Set color to ${preset}`}
            onClick={() => {
              setColor(preset)
              void apply({ color: preset })
            }}
            className={`size-6 rounded border transition-transform hover:scale-110 ${
              color.toLowerCase() === preset ? 'border-live ring-1 ring-live' : 'border-border'
            }`}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="rgb-colorful" className="text-sm">
          Colorful (cycle through colors)
        </Label>
        <Switch
          id="rgb-colorful"
          checked={colorful}
          onCheckedChange={(checked) => {
            setColorful(checked)
            void apply({ colorful: checked })
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs text-muted-foreground uppercase">Brightness</Label>
          <span className="font-mono text-xs text-muted-foreground">{brightness}/5</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[brightness]}
          onValueChange={([v]) => setBrightness(v)}
          onValueCommit={([v]) => void apply({ brightness: v })}
        />
      </div>

      {showMovementControls && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs text-muted-foreground uppercase">Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">{speed}/5</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              onValueCommit={([v]) => void apply({ speed: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs text-muted-foreground uppercase">Direction</Label>
            <div className="flex gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDirection(d.id)
                    void apply({ direction: d.id })
                  }}
                  className={`rounded-md border px-3 py-1 text-xs ${
                    direction === d.id
                      ? 'border-live bg-live/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {applying && <p className="font-mono text-[0.7rem] text-muted-foreground">applying…</p>}
    </div>
  )
}
