import { useEffect, useRef } from 'react'
import { F75_MAX_LAYOUT, normalizedCentre, type Rect } from '@/lib/lighting/keyboardLayout'
import { effectColor, isStaticEffect, rgbToCss, type RGB } from '@/lib/lighting/renderer'
import type { LightingSettings } from '@/lib/lighting/settings'

const FPS = 30
/** Padding around the key area, in key units, for the case. */
const CASE_PAD = 0.45
const layout = F75_MAX_LAYOUT
const keyCentres = layout.keys.map((key) => normalizedCentre(key))

/**
 * The F75 Max drawn on a canvas with its RGB under-glow animated from
 * effectColor(). Approximates the firmware's effects — it can't read what
 * the keyboard actually draws. Stops animating when off-screen (including
 * inactive tabs, which are display:none), for static effects, and when the
 * user prefers reduced motion.
 */
export function KeyboardPreview({ settings }: { settings: LightingSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const redrawRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const glowCanvas = document.createElement('canvas')
    const glowCtx = glowCanvas.getContext('2d')
    if (!glowCtx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = performance.now()
    let visible = true
    let frame = 0
    let lastDraw = 0

    const draw = (now: number) => {
      const time = reducedMotion.matches ? 0 : (now - start) / 1000
      drawKeyboard(ctx, glowCtx, canvas, glowCanvas, settingsRef.current, time)
    }

    const tick = (now: number) => {
      frame = 0
      if (!visible) return
      if (now - lastDraw >= 1000 / FPS - 1) {
        lastDraw = now
        draw(now)
      }
      if (!reducedMotion.matches && !isStaticEffect(settingsRef.current.mode)) {
        frame = requestAnimationFrame(tick)
      }
    }

    const restart = () => {
      if (frame) cancelAnimationFrame(frame)
      lastDraw = 0
      frame = requestAnimationFrame(tick)
    }
    redrawRef.current = restart

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) return
      for (const c of [canvas, glowCanvas]) {
        c.width = Math.round(width * dpr)
        c.height = Math.round(height * dpr)
      }
      restart()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) restart()
    })
    intersectionObserver.observe(canvas)
    reducedMotion.addEventListener('change', restart)
    // Static effects never re-render on their own; keep the screen clock current.
    const clockTimer = window.setInterval(() => {
      if (visible && !frame) restart()
    }, 30_000)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.clearInterval(clockTimer)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      reducedMotion.removeEventListener('change', restart)
      redrawRef.current = () => {}
    }
  }, [])

  // Settings changed: redraw (and resume animating if the new effect moves).
  useEffect(() => {
    redrawRef.current()
  }, [settings])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Preview of the selected lighting effect on the keyboard"
      className="block h-auto w-full"
      style={{ aspectRatio: `${layout.width + CASE_PAD * 2} / ${layout.height + CASE_PAD * 2}` }}
    />
  )
}

function drawKeyboard(
  ctx: CanvasRenderingContext2D,
  glowCtx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  glowCanvas: HTMLCanvasElement,
  settings: LightingSettings,
  time: number,
) {
  const W = canvas.width
  const H = canvas.height
  const unit = Math.min(W / (layout.width + CASE_PAD * 2), H / (layout.height + CASE_PAD * 2))
  const originX = (W - (layout.width + CASE_PAD * 2) * unit) / 2 + CASE_PAD * unit
  const originY = (H - (layout.height + CASE_PAD * 2) * unit) / 2 + CASE_PAD * unit
  const toPx = (r: Rect) => ({ x: originX + r.x * unit, y: originY + r.y * unit, w: r.width * unit, h: r.height * unit })

  const glow: RGB[] = layout.keys.map((_, i) => effectColor(settings, keyCentres[i].x, keyCentres[i].y, time))

  ctx.clearRect(0, 0, W, H)

  // Case.
  const caseRect = {
    x: originX - CASE_PAD * unit * 0.8,
    y: originY - CASE_PAD * unit * 0.8,
    w: (layout.width + CASE_PAD * 1.6) * unit,
    h: (layout.height + CASE_PAD * 1.6) * unit,
  }
  const caseGradient = ctx.createLinearGradient(0, caseRect.y, 0, caseRect.y + caseRect.h)
  caseGradient.addColorStop(0, '#2c2d33')
  caseGradient.addColorStop(1, '#1b1c20')
  ctx.fillStyle = caseGradient
  roundRect(ctx, caseRect.x, caseRect.y, caseRect.w, caseRect.h, unit * 0.35)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = Math.max(1, unit * 0.03)
  ctx.stroke()

  // Under-glow: each key's colour drawn on a separate layer, then blurred
  // onto the plate so light spills out from between the caps.
  glowCtx.clearRect(0, 0, W, H)
  layout.keys.forEach((key, i) => {
    const r = toPx(key.frame)
    glowCtx.fillStyle = rgbToCss(glow[i])
    glowCtx.fillRect(r.x, r.y, r.w, r.h)
  })
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.filter = `blur(${unit * 0.28}px)`
  ctx.drawImage(glowCanvas, 0, 0)
  ctx.filter = `blur(${unit * 0.08}px)`
  ctx.globalAlpha = 0.6
  ctx.drawImage(glowCanvas, 0, 0)
  ctx.restore()

  // Keycaps.
  const inset = unit * 0.07
  const fontSize = unit * 0.22
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  layout.keys.forEach((key, i) => {
    const r = toPx(key.frame)
    const x = r.x + inset
    const y = r.y + inset
    const w = r.w - inset * 2
    const h = r.h - inset * 2
    const light = key.tone === 'light'

    ctx.fillStyle = light ? '#b9b8b3' : '#26272c'
    roundRect(ctx, x, y, w, h, unit * 0.12)
    ctx.fill()
    // Top face, slightly inset and lighter.
    ctx.fillStyle = light ? '#d4d3ce' : '#313238'
    roundRect(ctx, x + unit * 0.06, y + unit * 0.04, w - unit * 0.12, h - unit * 0.14, unit * 0.09)
    ctx.fill()
    // Coloured rim where the glow catches the cap edge.
    ctx.strokeStyle = rgbToCss(glow[i], 0.5)
    ctx.lineWidth = Math.max(0.5, unit * 0.035)
    roundRect(ctx, x, y, w, h, unit * 0.12)
    ctx.stroke()

    if (key.label) {
      ctx.fillStyle = light ? 'rgba(30,30,34,0.8)' : 'rgba(242,241,238,0.75)'
      ctx.font = `500 ${key.label.length > 3 ? fontSize * 0.82 : fontSize}px 'Geist Variable', ui-sans-serif, sans-serif`
      ctx.fillText(key.label, x + w / 2, y + h / 2 - unit * 0.04)
    }
  })

  // Screen.
  const s = toPx(layout.screenFrame)
  ctx.fillStyle = '#0c0d10'
  roundRect(ctx, s.x, s.y, s.w, s.h, unit * 0.08)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = Math.max(0.5, unit * 0.025)
  ctx.stroke()
  const now = new Date()
  ctx.fillStyle = 'rgba(242,241,238,0.85)'
  ctx.font = `500 ${unit * 0.24}px 'IBM Plex Mono', ui-monospace, monospace`
  ctx.fillText(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    s.x + s.w / 2,
    s.y + s.h / 2,
  )

  // Knob.
  const kx = originX + layout.knobCenter.x * unit
  const ky = originY + layout.knobCenter.y * unit
  const kr = layout.knobRadius * unit
  const knobGradient = ctx.createRadialGradient(kx - kr * 0.3, ky - kr * 0.3, kr * 0.1, kx, ky, kr)
  knobGradient.addColorStop(0, '#5a5b62')
  knobGradient.addColorStop(1, '#2a2b30')
  ctx.fillStyle = knobGradient
  ctx.beginPath()
  ctx.arc(kx, ky, kr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = Math.max(0.5, unit * 0.02)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = Math.max(0.5, unit * 0.015)
  ctx.beginPath()
  for (let t = 0; t < 24; t++) {
    const a = (t / 24) * Math.PI * 2
    ctx.moveTo(kx + Math.cos(a) * kr * 0.82, ky + Math.sin(a) * kr * 0.82)
    ctx.lineTo(kx + Math.cos(a) * kr * 0.97, ky + Math.sin(a) * kr * 0.97)
  }
  ctx.stroke()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}
