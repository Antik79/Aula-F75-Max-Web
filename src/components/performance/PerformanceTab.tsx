import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useConnection } from '@/state/connectionContext'
import { RESPONSE_LEVELS, SLEEP_TIMES } from '@/lib/device/labels'
import { usePersistedState } from '@/hooks/usePersistedState'

export function PerformanceTab() {
  const { dongleDevice } = useConnection()
  const [level, setLevel] = usePersistedState('aula.performance.level', 3)
  const [sleepTime, setSleepTime] = usePersistedState('aula.performance.sleepTime', 1)
  const [gameMode, setGameMode] = usePersistedState('aula.performance.gameMode', false)
  const [busy, setBusy] = useState(false)

  const applyPerformance = async (nextLevel: number, nextSleep: number) => {
    if (!dongleDevice) return
    setBusy(true)
    try {
      await dongleDevice.applyPerformance({ level: nextLevel, sleepTime: nextSleep })
    } catch (error) {
      toast.error('Could not apply performance settings', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const applyGameMode = async (enabled: boolean) => {
    if (!dongleDevice) return
    setBusy(true)
    try {
      await dongleDevice.setGameMode({ enabled, level, sleepTime })
    } catch (error) {
      toast.error('Could not toggle Game Mode', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-muted-foreground uppercase">Response rate</Label>
        <div className="space-y-1.5">
          {RESPONSE_LEVELS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setLevel(option.id)
                void applyPerformance(option.id, sleepTime)
              }}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                level === option.id
                  ? 'border-live bg-live/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{option.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{option.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="font-mono text-xs text-muted-foreground uppercase">Sleep timeout</Label>
        <div className="flex flex-wrap gap-1.5">
          {SLEEP_TIMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSleepTime(option.id)
                void applyPerformance(level, option.id)
              }}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                sleepTime === option.id
                  ? 'border-live bg-live/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.title}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="game-mode" className="text-sm">
            Game Mode
          </Label>
          <p className="text-xs text-muted-foreground">Disables Alt+Tab, Alt+F4, and the Windows key.</p>
        </div>
        <Switch
          id="game-mode"
          checked={gameMode}
          onCheckedChange={(checked) => {
            setGameMode(checked)
            void applyGameMode(checked)
          }}
        />
      </div>

      {busy && <p className="font-mono text-[0.7rem] text-muted-foreground">applying…</p>}
    </div>
  )
}
