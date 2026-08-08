import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useConnection } from '@/state/connectionContext'
import { AulaConstants, encodeDisplayStream } from '@/lib/protocol'
import { decodeImageFile, type DecodedFrame } from '@/lib/display/decodeImage'
import type { FitMode } from '@/lib/display/fitRect'

const FIT_MODES: { id: FitMode; title: string }[] = [
  { id: 'contain', title: 'Fit' },
  { id: 'cover', title: 'Fill' },
  { id: 'stretch', title: 'Stretch' },
]

const PREVIEW_SIZE_PX = 192

export function DisplayTab() {
  const { wiredDevice } = useConnection()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fitMode, setFitMode] = useState<FitMode>('contain')
  const [slot, setSlot] = useState(1)
  const [frames, setFrames] = useState<DecodedFrame[] | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ sent: number; total: number } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Re-decode whenever the file or fit mode changes, so the preview always
  // reflects what would actually be uploaded.
  useEffect(() => {
    if (!file) {
      setFrames(null)
      return
    }
    let cancelled = false
    setDecoding(true)
    decodeImageFile(file, fitMode)
      .then((decoded) => {
        if (!cancelled) setFrames(decoded)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error('Could not read that image', { description: error instanceof Error ? error.message : undefined })
          setFrames(null)
        }
      })
      .finally(() => {
        if (!cancelled) setDecoding(false)
      })
    return () => {
      cancelled = true
    }
  }, [file, fitMode])

  // Draw the decoded frame(s) to the preview canvas, animating through them
  // at their real delays when there's more than one.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frames || frames.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let index = 0
    let timeoutId: number

    const drawFrame = () => {
      const frame = frames[index]
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(frame.rgba), AulaConstants.displayWidth, AulaConstants.displayHeight),
        0,
        0,
      )
      if (frames.length > 1) {
        timeoutId = window.setTimeout(() => {
          index = (index + 1) % frames.length
          drawFrame()
        }, Math.max(frame.delaySeconds * 1000, 20))
      }
    }
    drawFrame()
    return () => window.clearTimeout(timeoutId)
  }, [frames])

  const handleUpload = async () => {
    if (!frames || !wiredDevice) return
    try {
      const { data, chunkCount } = encodeDisplayStream(frames)
      setUploadProgress({ sent: 0, total: chunkCount })
      await wiredDevice.uploadDisplayStream(data, slot, (progress) => {
        setUploadProgress({ sent: progress.sentChunks, total: progress.totalChunks })
      })
      toast.success('Uploaded to display', { description: `Slot ${slot}, ${frames.length} frame${frames.length === 1 ? '' : 's'}` })
    } catch (error) {
      toast.error('Could not upload image', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setUploadProgress(null)
    }
  }

  const handleSyncTime = async () => {
    if (!wiredDevice) return
    setSyncing(true)
    try {
      await wiredDevice.syncTime()
      toast.success('Clock synced to this device’s time')
    } catch (error) {
      toast.error('Could not sync clock', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSyncing(false)
    }
  }

  const handleFactoryReset = async () => {
    if (!wiredDevice) return
    setResetting(true)
    try {
      await wiredDevice.factoryReset((step) => toast.message(step))
      toast.success('Factory reset complete')
    } catch (error) {
      toast.error('Factory reset failed', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-muted-foreground uppercase">Display image</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null}>
            Choose image…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-1.5">
            {FIT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFitMode(m.id)}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  fitMode === m.id ? 'border-live bg-live/10 text-foreground' : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="display-slot" className="font-mono text-xs text-muted-foreground">
              Slot
            </Label>
            <Input
              id="display-slot"
              type="number"
              min={1}
              max={255}
              value={slot}
              onChange={(e) => setSlot(Math.min(255, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 font-mono"
            />
          </div>
        </div>

        {file && (
          <div className="flex items-start gap-4 pt-2">
            <canvas
              ref={canvasRef}
              width={AulaConstants.displayWidth}
              height={AulaConstants.displayHeight}
              style={{ width: PREVIEW_SIZE_PX, height: PREVIEW_SIZE_PX, imageRendering: 'pixelated' }}
              className="shrink-0 rounded border border-border bg-black"
            />
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                {decoding
                  ? 'Decoding…'
                  : frames
                    ? `${frames.length} frame${frames.length === 1 ? '' : 's'} · 128×128`
                    : 'Could not decode this file.'}
              </p>
              <Button
                onClick={() => void handleUpload()}
                disabled={!frames || decoding || uploadProgress !== null}
                size="sm"
              >
                {uploadProgress ? 'Uploading…' : 'Upload to keyboard'}
              </Button>
            </div>
          </div>
        )}

        {uploadProgress && (
          <div className="space-y-1">
            <Progress value={(uploadProgress.sent / Math.max(uploadProgress.total, 1)) * 100} />
            <p className="font-mono text-[0.7rem] text-muted-foreground">
              {uploadProgress.sent}/{uploadProgress.total} chunks
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, GIF, BMP, or WebP. Animated GIFs upload as one multi-frame image — all frames go up together.
        </p>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Clock</Label>
          <p className="text-xs text-muted-foreground">Sync the display clock to this device's time.</p>
        </div>
        <Button variant="secondary" onClick={() => void handleSyncTime()} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Factory reset</Label>
          <p className="text-xs text-muted-foreground">Clears display slots and lighting/keymap configuration.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={resetting}>
              {resetting ? 'Resetting…' : 'Factory reset'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Factory reset the keyboard?</DialogTitle>
              <DialogDescription>
                This clears display slots, lighting, and keymap/macro data on the device. This can't be undone from here.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={() => void handleFactoryReset()}>
                Reset now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
