import { vi } from 'vitest'
import type { HidInputReportEvent, HidPort } from '@/lib/webhid/hidPort'

export class FakeHidPort implements HidPort {
  sentFeatureReports: { reportId: number; data: Uint8Array }[] = []
  sentReports: { reportId: number; data: Uint8Array }[] = []
  featureReportResponse: DataView = new DataView(new ArrayBuffer(0))

  private listeners = new Set<(event: HidInputReportEvent) => void>()

  sendFeatureReport = vi.fn(async (reportId: number, data: BufferSource) => {
    this.sentFeatureReports.push({ reportId, data: toUint8Array(data) })
  })

  receiveFeatureReport = vi.fn(async (_reportId: number) => this.featureReportResponse)

  sendReport = vi.fn(async (reportId: number, data: BufferSource) => {
    this.sentReports.push({ reportId, data: toUint8Array(data) })
  })

  addEventListener(_type: 'inputreport', listener: (event: HidInputReportEvent) => void): void {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'inputreport', listener: (event: HidInputReportEvent) => void): void {
    this.listeners.delete(listener)
  }

  dispatchInputReport(data: Uint8Array, reportId = 0): void {
    const event: HidInputReportEvent = { data: toDataView(data), reportId }
    for (const listener of this.listeners) listener(event)
  }
}

function toUint8Array(data: BufferSource): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer)
}

function toDataView(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength)
}
