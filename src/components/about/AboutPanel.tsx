import { Separator } from '@/components/ui/separator'
import { LINUX_UDEV_RULE } from '@/lib/webhid/errors'

export function AboutPanel() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-sm font-medium text-foreground">Supported browsers</h2>
        <p className="text-sm text-muted-foreground">
          This app talks to the keyboard using WebHID, which currently only ships in Chromium-based browsers: Chrome,
          Edge, Opera, and Brave on desktop. Firefox and Safari don't support it yet.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="font-heading text-sm font-medium text-foreground">Linux permissions</h2>
        <p className="text-sm text-muted-foreground">
          The browser needs OS-level permission to open the keyboard's raw HID device. If connecting fails with a
          permission error, install this udev rule, then unplug and replug the keyboard and receiver:
        </p>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-xs text-foreground">
          {LINUX_UDEV_RULE}
        </pre>
        <p className="text-xs text-muted-foreground">
          Save it to <code className="font-mono">/etc/udev/rules.d/60-aula-f75-max.rules</code>, then run{' '}
          <code className="font-mono">sudo udevadm control --reload-rules && sudo udevadm trigger</code>.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="font-heading text-sm font-medium text-foreground">About this project</h2>
        <p className="text-sm text-muted-foreground">
          A browser-based configurator for the EpoMaker x Aula F75 Max keyboard, ported from the native{' '}
          <a
            href="https://github.com/VitalyArt/Aula-F75-Max-Driver"
            target="_blank"
            rel="noreferrer"
            className="text-live underline underline-offset-4"
          >
            Aula F75 Max Driver
          </a>{' '}
          project. Nothing you configure here leaves your browser — it talks to the keyboard directly over USB.
        </p>
      </div>
    </div>
  )
}
