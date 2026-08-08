import type { ApplyPerformanceOptions, ApplyRgbOptions, AulaDongleDevice } from '@/lib/device/types'
import { clamp } from '@/lib/webhid/normalize'

export interface MockDongleState {
  rgb: ApplyRgbOptions
  performance: ApplyPerformanceOptions
  batteryPercent: number
}

export interface MockDongleDeviceOptions {
  initialBatteryPercent?: number
}

const DEFAULT_RGB: ApplyRgbOptions = { mode: 1, brightness: 3, speed: 3, direction: 0, colorful: false, color: 0x00ff00 }
const DEFAULT_PERFORMANCE: ApplyPerformanceOptions = {
  level: 3,
  sleepTime: 1,
  disableWin: false,
  disableAltF4: false,
  disableAltTab: false,
}

export class MockDongleDevice implements AulaDongleDevice {
  private rgb: ApplyRgbOptions = { ...DEFAULT_RGB }
  private performance: ApplyPerformanceOptions = { ...DEFAULT_PERFORMANCE }
  private batteryPercent: number

  constructor(options: MockDongleDeviceOptions = {}) {
    this.batteryPercent = options.initialBatteryPercent ?? 100
  }

  async applyRGB(options: ApplyRgbOptions): Promise<void> {
    this.rgb = { ...options }
  }

  async applyPerformance(options: ApplyPerformanceOptions): Promise<void> {
    this.performance = { ...options }
  }

  async queryBattery(): Promise<number> {
    const current = this.batteryPercent
    this.batteryPercent = clamp(this.batteryPercent - 1, 1, 100)
    return current
  }

  getState(): MockDongleState {
    return {
      rgb: { ...this.rgb },
      performance: { ...this.performance },
      batteryPercent: this.batteryPercent,
    }
  }
}
