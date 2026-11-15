import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BatteryIndicator } from '@/components/battery/BatteryIndicator'
import { RgbTab } from '@/components/rgb/RgbTab'
import { PerformanceTab } from '@/components/performance/PerformanceTab'
import { DisplayTab } from '@/components/display/DisplayTab'
import { AboutPanel } from '@/components/about/AboutPanel'
import { KeyboardGuide } from '@/components/guide/KeyboardGuide'
import { ActivityLogButton } from '@/components/activity/ActivityLog'
import { useConnection, type DeviceStatus } from '@/state/connectionContext'

function RailDot({ status }: { status: DeviceStatus }) {
  const color =
    status === 'connected'
      ? 'bg-live shadow-[0_0_8px_1.5px_var(--live-accent)]'
      : status === 'connecting'
        ? 'bg-live/60 animate-pulse'
        : status === 'error'
          ? 'bg-destructive'
          : 'bg-muted-foreground/30'
  return <span className={`inline-block size-2 rounded-full ${color}`} />
}

function Placeholder({ message }: { message: string }) {
  return <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
}

export function AppShell() {
  const { mode, wiredStatus, dongleStatus } = useConnection()
  const dongleReady = dongleStatus === 'connected'
  const wiredReady = wiredStatus === 'connected'

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-52 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4">
        <div>
          <h1 className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">Aula F75 Max</h1>
          {mode === 'demo' && (
            <Badge variant="outline" className="mt-1 font-mono text-[0.6rem] text-muted-foreground">
              demo mode
            </Badge>
          )}
        </div>

        <div className="space-y-2 font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <RailDot status={wiredStatus} />
            wired
          </div>
          <div className="flex items-center gap-2">
            <RailDot status={dongleStatus} />
            2.4G receiver
          </div>
        </div>

        <BatteryIndicator />

        <div className="mt-auto space-y-3">
          <ActivityLogButton className="font-mono text-xs" />
          <div
            className="h-1.5 w-full rounded-full"
            style={{ backgroundColor: 'var(--live-accent)' }}
            aria-hidden
            title="Current RGB accent"
          />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="rgb">
          <TabsList variant="line">
            <TabsTrigger value="rgb">RGB</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/*
            forceMount keeps every tab's component mounted once shown, instead of
            Radix's default of unmounting inactive tabs — which was resetting each
            tab's local state (RGB picks, key restrictions) back to defaults on every
            switch, without actually telling the keyboard anything changed.
          */}
          <TabsContent value="rgb" forceMount className="pt-6 data-[state=inactive]:hidden">
            {dongleReady ? <RgbTab /> : <Placeholder message="Connect the 2.4G receiver to control RGB lighting." />}
          </TabsContent>
          <TabsContent value="performance" forceMount className="pt-6 data-[state=inactive]:hidden">
            {dongleReady ? (
              <PerformanceTab />
            ) : (
              <Placeholder message="Connect the 2.4G receiver to change response rate, sleep timeout, and key restrictions." />
            )}
          </TabsContent>
          <TabsContent value="display" forceMount className="pt-6 data-[state=inactive]:hidden">
            {wiredReady ? (
              <DisplayTab />
            ) : (
              <Placeholder message="Connect the wired keyboard to upload display images, sync the clock, or factory reset." />
            )}
          </TabsContent>
          <TabsContent value="guide" forceMount className="pt-6 data-[state=inactive]:hidden">
            <KeyboardGuide />
          </TabsContent>
          <TabsContent value="about" forceMount className="pt-6 data-[state=inactive]:hidden">
            <AboutPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
