import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConnection } from '@/state/connectionContext'
import type { ConnectionError, DeviceStatus } from '@/state/connectionContext'
import { LINUX_UDEV_RULE } from '@/lib/webhid/errors'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KeyboardGuide } from '@/components/guide/KeyboardGuide'

function StatusDot({ status }: { status: DeviceStatus }) {
  const color =
    status === 'connected'
      ? 'bg-live shadow-[0_0_10px_2px_var(--live-accent)]'
      : status === 'connecting'
        ? 'bg-live/60 animate-pulse'
        : status === 'error'
          ? 'bg-destructive'
          : 'bg-muted-foreground/40'
  return <span className={`inline-block size-2.5 rounded-full ${color}`} />
}

function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case 'connected':
      return 'linked'
    case 'connecting':
      return 'linking…'
    case 'error':
      return 'connection failed'
    default:
      return 'not linked'
  }
}

function ConnectorCard({
  title,
  subtitle,
  status,
  error,
  onConnect,
}: {
  title: string
  subtitle: string
  status: DeviceStatus
  error: ConnectionError | null
  onConnect: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-sm font-medium tracking-wide text-foreground uppercase">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <StatusDot status={status} />
          {statusLabel(status)}
        </div>
      </div>
      <Button onClick={onConnect} disabled={status === 'connecting'} variant={status === 'connected' ? 'secondary' : 'default'}>
        {status === 'connected' ? 'Reconnect' : status === 'connecting' ? 'Connecting…' : 'Connect'}
      </Button>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <p>{error.message}</p>
          {error.showUdevHint && (
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground">
                On Linux, the browser needs OS-level permission to open this device. Install this udev rule, replug the
                device, then reconnect:
              </p>
              <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-[0.7rem] text-foreground">
                {LINUX_UDEV_RULE}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ConnectScreen() {
  const { webHidSupported, wiredStatus, dongleStatus, wiredError, dongleError, connectWired, connectDongle, startDemoMode } =
    useConnection()

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/40">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">Aula F75 Max</h1>
            <p className="text-xs text-muted-foreground">Web configurator</p>
          </div>
          <Badge variant="outline" className="font-mono text-[0.65rem] text-muted-foreground">
            WebHID
          </Badge>
        </div>

        {!webHidSupported && (
          <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            This browser doesn't support WebHID. Use a recent Chrome, Edge, Opera, or Brave build on desktop to connect a
            real keyboard — or try demo mode below, which works everywhere.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ConnectorCard
            title="Wired"
            subtitle="Display, clock, factory reset"
            status={wiredStatus}
            error={wiredError}
            onConnect={connectWired}
          />
          <ConnectorCard
            title="2.4G Receiver"
            subtitle="RGB, performance, battery"
            status={dongleStatus}
            error={dongleError}
            onConnect={connectDongle}
          />
        </div>

        <details className="mt-5 rounded-md border border-border bg-card/60 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-mono uppercase select-none">Using Linux? Read this first</summary>
          <div className="mt-2 space-y-1">
            <p>
              The browser needs OS-level permission to open the keyboard's raw HID device. If "Connect" doesn't find
              anything, install this udev rule, then unplug and replug the keyboard/receiver:
            </p>
            <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-[0.7rem] text-foreground">
              {LINUX_UDEV_RULE}
            </pre>
          </div>
        </details>

        <div className="mt-5 flex items-center justify-center gap-6">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Keyboard guide
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
              <DialogTitle className="font-heading">Keyboard guide</DialogTitle>
              <DialogDescription className="sr-only">Fn shortcuts and pairing reference</DialogDescription>
              <KeyboardGuide />
            </DialogContent>
          </Dialog>
          <button
            type="button"
            onClick={startDemoMode}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Try demo mode →
          </button>
        </div>
      </div>
    </div>
  )
}
