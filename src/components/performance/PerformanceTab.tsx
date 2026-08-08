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
  const [disableWin, setDisableWin] = usePersistedState('aula.performance.disableWin', false)
  const [disableAltF4, setDisableAltF4] = usePersistedState('aula.performance.disableAltF4', false)
  const [disableAltTab, setDisableAltTab] = usePersistedState('aula.performance.disableAltTab', false)
  const [busy, setBusy] = useState(false)

  const applyPerformance = async (
    overrides: Partial<{ level: number; sleepTime: number; disableWin: boolean; disableAltF4: boolean; disableAltTab: boolean }> = {},
  ) => {
    if (!dongleDevice) return
    const next = { level, sleepTime, disableWin, disableAltF4, disableAltTab, ...overrides }
    setBusy(true)
    try {
      await dongleDevice.applyPerformance(next)
    } catch (error) {
      toast.error('Could not apply performance settings', { description: error instanceof Error ? error.message : undefined })
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
                void applyPerformance({ level: option.id })
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
                void applyPerformance({ sleepTime: option.id })
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

      <div className="space-y-3">
        <Label className="font-mono text-xs text-muted-foreground uppercase">Restrictions</Label>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="disable-win" className="text-sm">
            Disable Windows Key
          </Label>
          <Switch
            id="disable-win"
            checked={disableWin}
            onCheckedChange={(checked) => {
              setDisableWin(checked)
              void applyPerformance({ disableWin: checked })
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="disable-alt-f4" className="text-sm">
            Disable ALT+F4
          </Label>
          <Switch
            id="disable-alt-f4"
            checked={disableAltF4}
            onCheckedChange={(checked) => {
              setDisableAltF4(checked)
              void applyPerformance({ disableAltF4: checked })
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="disable-alt-tab" className="text-sm">
            Disable ALT+Tab
          </Label>
          <Switch
            id="disable-alt-tab"
            checked={disableAltTab}
            onCheckedChange={(checked) => {
              setDisableAltTab(checked)
              void applyPerformance({ disableAltTab: checked })
            }}
          />
        </div>
      </div>

      {busy && <p className="font-mono text-[0.7rem] text-muted-foreground">applying…</p>}
    </div>
  )
}
