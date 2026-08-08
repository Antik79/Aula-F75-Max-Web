export type FitMode = 'contain' | 'cover' | 'stretch'

export interface FitRect {
  x: number
  y: number
  width: number
  height: number
}

export function computeFitRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fitMode: FitMode,
): FitRect {
  if (fitMode === 'stretch') {
    return { x: 0, y: 0, width: targetWidth, height: targetHeight }
  }

  const scaleX = targetWidth / sourceWidth
  const scaleY = targetHeight / sourceHeight
  const scale = fitMode === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  }
}
