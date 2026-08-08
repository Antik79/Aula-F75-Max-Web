import { decompressFrames, parseGIF } from 'gifuct-js'
import { AulaConstants } from '@/lib/protocol'
import { computeFitRect, type FitMode } from './fitRect'

export interface DecodedFrame {
  rgba: Uint8Array
  delaySeconds: number
}

function fitOntoCanvas(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, fitMode: FitMode): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = AulaConstants.displayWidth
  canvas.height = AulaConstants.displayHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const rect = computeFitRect(sourceWidth, sourceHeight, AulaConstants.displayWidth, AulaConstants.displayHeight, fitMode)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height)

  const imageData = ctx.getImageData(0, 0, AulaConstants.displayWidth, AulaConstants.displayHeight)
  return new Uint8Array(imageData.data.buffer)
}

async function decodeStaticImage(file: File, fitMode: FitMode): Promise<DecodedFrame[]> {
  const bitmap = await createImageBitmap(file)
  try {
    const rgba = fitOntoCanvas(bitmap, bitmap.width, bitmap.height, fitMode)
    return [{ rgba, delaySeconds: 0.1 }]
  } finally {
    bitmap.close()
  }
}

async function decodeGif(file: File, fitMode: FitMode): Promise<DecodedFrame[]> {
  const buffer = await file.arrayBuffer()
  const gif = parseGIF(buffer)
  const frames = decompressFrames(gif, true)
  const width = gif.lsd.width
  const height = gif.lsd.height

  const compositeCanvas = document.createElement('canvas')
  compositeCanvas.width = width
  compositeCanvas.height = height
  const compositeCtx = compositeCanvas.getContext('2d')
  if (!compositeCtx) throw new Error('2D canvas context unavailable')

  const patchCanvas = document.createElement('canvas')
  const patchCtx = patchCanvas.getContext('2d')
  if (!patchCtx) throw new Error('2D canvas context unavailable')

  const results: DecodedFrame[] = []
  let previousImageData: ImageData | null = null

  for (const frame of frames) {
    if (frame.disposalType === 3) {
      previousImageData = compositeCtx.getImageData(0, 0, width, height)
    }

    patchCanvas.width = frame.dims.width
    patchCanvas.height = frame.dims.height
    patchCtx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height), 0, 0)
    compositeCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

    const rgba = fitOntoCanvas(compositeCanvas, width, height, fitMode)
    results.push({ rgba, delaySeconds: (frame.delay ?? 100) / 1000 })

    if (frame.disposalType === 2) {
      compositeCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height)
    } else if (frame.disposalType === 3 && previousImageData) {
      compositeCtx.putImageData(previousImageData, 0, 0)
    }
  }

  return results
}

export async function decodeImageFile(file: File, fitMode: FitMode): Promise<DecodedFrame[]> {
  if (file.type === 'image/gif') {
    return decodeGif(file, fitMode)
  }
  return decodeStaticImage(file, fitMode)
}
