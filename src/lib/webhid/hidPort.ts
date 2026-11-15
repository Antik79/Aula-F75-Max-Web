import { delay } from '@/lib/timing'
import { errorMessage, hexHeader, logActivity, logActivityOnce } from '@/lib/activity/log'

export interface HidInputReportEvent {
  data: DataView
  reportId: number
}

/**
 * Minimal subset of WebHID's HIDDevice this app depends on. Every command the
 * device accepts uses report ID 0 (confirmed from the native driver's macOS
 * IOHIDDeviceSetReport/GetReport calls, which pass reportID 0 explicitly).
 */
export interface HidPort {
  sendFeatureReport(reportId: number, data: Uint8Array): Promise<void>
  receiveFeatureReport(reportId: number): Promise<DataView>
  sendReport(reportId: number, data: Uint8Array): Promise<void>
  addEventListener(type: 'inputreport', listener: (event: HidInputReportEvent) => void): void
  removeEventListener(type: 'inputreport', listener: (event: HidInputReportEvent) => void): void
}

export interface CommandExchangeOptions {
  /** Total tries for the SET_REPORT + ready-wait pair before giving up. */
  attempts?: number
  /** Pause between failed tries. */
  retryDelayMs?: number
  /** Pause before each GET_REPORT poll for the ready flag. */
  pollIntervalMs?: number
  /** GET_REPORT polls before accepting the last reply without the ready flag. */
  maxPolls?: number
}

export const COMMAND_EXCHANGE_DEFAULTS: Required<CommandExchangeOptions> = {
  attempts: 6,
  retryDelayMs: 200,
  pollIntervalMs: 50,
  maxPolls: 6,
}

/**
 * SET_REPORT the packet, then poll GET_REPORT until the keyboard says it has
 * finished applying it. Ported from upstream Aula-F75-Max-Driver 6c551e0 and
 * c44ffd8:
 *
 * - The firmware needs time to apply each packet before the next arrives;
 *   reading the reply once, immediately, made clock sync a no-op on some
 *   units (upstream issue #7). The device signals "ready" by echoing the
 *   command's two header bytes with byte[3] == 0x01. Data packets (e.g. the
 *   time payload) are echoed verbatim and never set the flag, so on timeout
 *   the last reply is returned rather than throwing — the wait still applies.
 * - Under sustained traffic (factory reset in particular, where 0x04/0xf0
 *   reboots the keyboard mid-sequence) SET_REPORT/GET_REPORT intermittently
 *   fail. Each exchange is retried a few times with a short pause.
 */
export async function commandExchange(
  port: HidPort,
  packet: Uint8Array,
  options: CommandExchangeOptions = {},
): Promise<DataView> {
  const { attempts, retryDelayMs } = { ...COMMAND_EXCHANGE_DEFAULTS, ...options }
  return withRetry(
    attempts,
    retryDelayMs,
    async () => {
      await port.sendFeatureReport(0, packet)
      return waitForReady(port, packet, options)
    },
    (attempt, error) => logRetry(`Command ${hexHeader(packet)}`, attempt, attempts, error),
  )
}

/** Command packets start 0x04; 0x04 0xf0 reboots the keyboard and isn't expected to ack. */
const expectsReadyFlag = (packet: Uint8Array) => packet[0] === 0x04 && packet[1] !== 0xf0

function logRetry(what: string, attempt: number, attempts: number, error: unknown) {
  const outcome = attempt < attempts ? 'retrying' : 'giving up'
  logActivity('wired', attempt < attempts ? 'warn' : 'error', `${what} failed (attempt ${attempt}/${attempts}, ${outcome}): ${errorMessage(error)}`)
}

async function waitForReady(port: HidPort, packet: Uint8Array, options: CommandExchangeOptions): Promise<DataView> {
  const { pollIntervalMs, maxPolls } = { ...COMMAND_EXCHANGE_DEFAULTS, ...options }
  let reply: DataView = new DataView(new ArrayBuffer(0))
  for (let poll = 0; poll < maxPolls; poll++) {
    await delay(pollIntervalMs)
    reply = await port.receiveFeatureReport(0)
    const offset = readyReplyOffset(reply, packet)
    if (offset !== null) {
      // Settles which reply layout this browser/OS returns (see readyReplyOffset).
      logActivityOnce(
        `ready-offset-${offset}`,
        'wired',
        'info',
        `Ready flag seen at reply offset ${offset} (${offset === 0 ? 'no' : 'leading'} report-ID byte, ${reply.byteLength}-byte reply)`,
      )
      return reply
    }
  }
  if (expectsReadyFlag(packet)) {
    logActivity('wired', 'info', `Command ${hexHeader(packet)}: no ready flag after ${maxPolls} polls, continuing`)
  }
  return reply
}

/**
 * True if the reply echoes the packet's header with the ready flag set.
 * Accepts the payload either at offset 0 or shifted by one leading
 * report-ID byte, since whether Chromium's receiveFeatureReport() prefixes
 * report ID 0 has varied by platform.
 */
export function isReadyReply(reply: DataView, packet: Uint8Array): boolean {
  return readyReplyOffset(reply, packet) !== null
}

/** Where the ready echo was found: 0, 1 (after a report-ID byte), or null. */
export function readyReplyOffset(reply: DataView, packet: Uint8Array): 0 | 1 | null {
  const matchesAt = (offset: number) =>
    reply.byteLength > offset + 3 &&
    reply.getUint8(offset) === packet[0] &&
    reply.getUint8(offset + 1) === packet[1] &&
    reply.getUint8(offset + 3) === 0x01
  if (matchesAt(0)) return 0
  if (reply.byteLength > 0 && reply.getUint8(0) === 0 && matchesAt(1)) return 1
  return null
}

async function withRetry<T>(
  attempts: number,
  retryDelayMs: number,
  operation: () => Promise<T>,
  onFailure?: (attempt: number, error: unknown) => void,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      onFailure?.(attempt, error)
      if (attempt < attempts) await delay(retryDelayMs)
    }
  }
  throw lastError
}

/**
 * Fire-and-forget SET_REPORT with no ack read back, used for zero-page filler
 * writes. Retried like commandExchange, since these run during factory reset.
 */
export function sendFeatureReport(
  port: HidPort,
  bytes: Uint8Array,
  options: Pick<CommandExchangeOptions, 'attempts' | 'retryDelayMs'> = {},
): Promise<void> {
  const { attempts, retryDelayMs } = { ...COMMAND_EXCHANGE_DEFAULTS, ...options }
  return withRetry(
    attempts,
    retryDelayMs,
    () => port.sendFeatureReport(0, bytes),
    (attempt, error) => logRetry(`Feature report ${hexHeader(bytes)}`, attempt, attempts, error),
  )
}

export function sendOutputReport(port: HidPort, bytes: Uint8Array): Promise<void> {
  return port.sendReport(0, bytes)
}

export function waitForInputReport(port: HidPort, timeoutMs: number): Promise<DataView | null> {
  return new Promise((resolve) => {
    let settled = false

    const onReport = (event: HidInputReportEvent) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      port.removeEventListener('inputreport', onReport)
      resolve(event.data)
    }

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      port.removeEventListener('inputreport', onReport)
      resolve(null)
    }, timeoutMs)

    port.addEventListener('inputreport', onReport)
  })
}
