import { Fragment } from 'react'
import { ExternalLink } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { usePersistedState } from '@/hooks/usePersistedState'
import { GUIDE_GROUPS, MANUAL_URL, rowsForMode, type GuideMode } from '@/lib/guide/catalog'

const MODES: { id: GuideMode; title: string }[] = [
  { id: 'windows', title: 'Windows' },
  { id: 'mac', title: 'Mac' },
]

function Keycap({ label }: { label: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border border-b-2 bg-secondary px-1.5 font-mono text-[0.7rem] text-foreground">
      {label}
    </kbd>
  )
}

/**
 * Offline Fn-shortcut reference. The Windows/Mac picker only changes which
 * F-row mapping is shown — it doesn't send anything to the keyboard or detect
 * its current mode.
 */
export function KeyboardGuide() {
  const [mode, setMode] = usePersistedState<GuideMode>('aula.guide.mode', 'windows')

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-foreground">Hold Fn and press the indicated key.</p>
          <a
            href={MANUAL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Open the F75 Max manual (PDF)
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-muted-foreground uppercase">Keyboard mode</Label>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Keyboard mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-md border px-3 py-1 text-xs ${
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
      </div>

      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {GUIDE_GROUPS.map((group) => (
          <section key={group.id} className={group.id === 'media' ? 'space-y-3 md:row-span-3' : 'space-y-3'}>
            <div className="space-y-1">
              <h2 className="font-heading text-sm font-semibold tracking-tight">{group.title}</h2>
              <p className="text-xs text-muted-foreground">{group.note}</p>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
              {rowsForMode(group, mode).map((row) => (
                <Fragment key={`${row.keys.join('+')}-${row.mode}`}>
                  <dt className="flex items-center gap-1">
                    {row.keys.map((key, i) => (
                      <Fragment key={key}>
                        {i > 0 && <span className="text-[0.65rem] text-muted-foreground">+</span>}
                        <Keycap label={key} />
                      </Fragment>
                    ))}
                  </dt>
                  <dd className="text-xs text-foreground">
                    {row.action}
                    {row.hold && (
                      <span className="ml-1.5 font-mono text-[0.65rem] text-live">hold 3 s</span>
                    )}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="font-mono text-[0.65rem] text-muted-foreground">
        From page 2 of the manual. Animation-speed shortcuts are omitted: the manual prints both directions as Fn + →.
        Media and OS actions depend on your operating system.
      </p>
    </div>
  )
}
