import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useConnection } from '@/state/connectionContext'
import {
  clearActivity,
  formatActivityReport,
  formatActivityTime,
  getActivityEntries,
  subscribeActivity,
  type ActivityLevel,
} from '@/lib/activity/log'

const ISSUES_URL = 'https://github.com/Antik79/Aula-F75-Max-Web/issues/new'

function useActivityEntries() {
  return useSyncExternalStore(subscribeActivity, getActivityEntries)
}

const LEVEL_CLASS: Record<ActivityLevel, string> = {
  info: 'text-muted-foreground',
  warn: 'text-amber-400',
  error: 'text-destructive',
}

function ActivityLogBody() {
  const entries = useActivityEntries()
  const { mode, webHidSupported } = useConnection()
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the newest entry in view.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [entries])

  const copy = async () => {
    const report = formatActivityReport(entries, {
      appVersion: __APP_VERSION__,
      userAgent: navigator.userAgent,
      webHidSupported,
      mode,
    })
    try {
      await navigator.clipboard.writeText(report)
      toast.success('Activity log copied', { description: 'Paste it into a GitHub issue.' })
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }

  return (
    <div className="space-y-3">
      <ol
        ref={listRef}
        className="h-[50svh] overflow-y-auto rounded-md border border-border bg-background p-2 font-mono text-[0.7rem] leading-relaxed"
      >
        {entries.length === 0 ? (
          <li className="text-muted-foreground">Nothing yet. Connect a device or change a setting.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-2">
              <span className="text-muted-foreground/70">{formatActivityTime(entry.time)}</span>
              <span className="w-12 text-muted-foreground/70">{entry.source}</span>
              <span className={`break-words ${LEVEL_CLASS[entry.level]}`}>{entry.message}</span>
            </li>
          ))
        )}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Kept in this tab only, last {entries.length > 0 ? `${entries.length} ` : ''}entries. Cleared on reload.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearActivity} disabled={entries.length === 0}>
            <Trash2 />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            <Copy />
            Copy log
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * "Activity log" trigger plus dialog. The trigger shows a red dot while the
 * log holds an error the user hasn't opened the log to see.
 */
export function ActivityLogButton({ className }: { className?: string }) {
  const entries = useActivityEntries()
  const [seenId, setSeenId] = useState(0)
  const unseenError = entries.some((e) => e.level === 'error' && e.id > seenId)

  return (
    <Dialog
      // Mark everything seen on open and on close (errors may arrive while open).
      onOpenChange={() => setSeenId(entries.at(-1)?.id ?? 0)}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${className ?? ''}`}
        >
          Activity log
          {unseenError && <span className="size-1.5 rounded-full bg-destructive" aria-label="contains errors" />}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="font-heading">Activity log</DialogTitle>
        <DialogDescription className="text-xs">
          What this page sent to the keyboard and how it went. If something doesn't work, copy this into{' '}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            a bug report
          </a>
          .
        </DialogDescription>
        <ActivityLogBody />
      </DialogContent>
    </Dialog>
  )
}
