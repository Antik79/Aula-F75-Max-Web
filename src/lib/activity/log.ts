/**
 * In-memory activity log: what the app asked the keyboard to do and how it
 * went. Nothing is persisted or sent anywhere — it lives in this page until
 * reload, and only leaves it if the user copies it (for a bug report).
 */

export type ActivityLevel = 'info' | 'warn' | 'error'
export type ActivitySource = 'app' | 'wired' | 'dongle'

export interface ActivityEntry {
  id: number
  time: Date
  level: ActivityLevel
  source: ActivitySource
  message: string
}

export const MAX_ACTIVITY_ENTRIES = 300

let entries: readonly ActivityEntry[] = []
let nextId = 1
const onceKeys = new Set<string>()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function logActivity(source: ActivitySource, level: ActivityLevel, message: string): void {
  const entry: ActivityEntry = { id: nextId++, time: new Date(), level, source, message }
  const next = [...entries, entry]
  entries = next.length > MAX_ACTIVITY_ENTRIES ? next.slice(next.length - MAX_ACTIVITY_ENTRIES) : next
  emit()
}

/** Log only the first time `key` is seen (until the log is cleared). */
export function logActivityOnce(key: string, source: ActivitySource, level: ActivityLevel, message: string): void {
  if (onceKeys.has(key)) return
  onceKeys.add(key)
  logActivity(source, level, message)
}

export function getActivityEntries(): readonly ActivityEntry[] {
  return entries
}

export function clearActivity(): void {
  entries = []
  onceKeys.clear()
  emit()
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function formatActivityTime(time: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(time.getMilliseconds(), 3)}`
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.name && error.name !== 'Error' ? `${error.name}: ${error.message}` : error.message
  return String(error)
}

/** First `count` bytes as spaced hex, e.g. "04 18". */
export function hexHeader(bytes: Uint8Array, count = 2): string {
  return Array.from(bytes.subarray(0, count), (b) => b.toString(16).padStart(2, '0')).join(' ')
}

export interface ActivityReportContext {
  appVersion: string
  userAgent: string
  webHidSupported: boolean
  mode: string
}

/** Plain-text log with an environment header, for pasting into an issue. */
export function formatActivityReport(log: readonly ActivityEntry[], context: ActivityReportContext): string {
  const header = [
    'Aula F75 Max Web — activity log',
    `App: ${context.appVersion}`,
    `Browser: ${context.userAgent}`,
    `WebHID: ${context.webHidSupported ? 'supported' : 'not supported'}`,
    `Mode: ${context.mode}`,
    `Copied: ${new Date().toISOString()}`,
    '',
  ]
  const lines = log.map(
    (e) => `${formatActivityTime(e.time)} ${e.level.toUpperCase().padEnd(5)} ${e.source.padEnd(6)} ${e.message}`,
  )
  return [...header, ...(lines.length ? lines : ['(no activity)'])].join('\n')
}
