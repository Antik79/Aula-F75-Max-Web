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

export async function commandExchange(port: HidPort, packet: Uint8Array): Promise<DataView> {
  await port.sendFeatureReport(0, packet)
  return port.receiveFeatureReport(0)
}

/** Fire-and-forget SET_REPORT with no ack read back, used for zero-page filler writes. */
export function sendFeatureReport(port: HidPort, bytes: Uint8Array): Promise<void> {
  return port.sendFeatureReport(0, bytes)
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
