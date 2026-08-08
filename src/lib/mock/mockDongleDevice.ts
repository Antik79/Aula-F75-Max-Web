import type {
  ApplyPerformanceOptions,
  ApplyRgbOptions,
  AulaDongleDevice,
  SetGameModeOptions,
} from '@/lib/device/types'
import { clamp } from '@/lib/webhid/normalize'

export interface MockDongleState {
  rgb: ApplyRgbOptions
  performance: ApplyPerformanceOptions
  gameMode: SetGameModeOptions
  batteryPercent: number
}

export interface MockDongleDeviceOptions {
  initialBatteryPercent?: number
}

const DEFAULT_RGB: ApplyRgbOptions = { mode: 1, brightness: 3, speed: 3, direction: 0, colorful: false, color: 0x00ff00 }
const DEFAULT_PERFORMANCE: ApplyPerformanceOptions = { level: 3, sleepTime: 1 }
const DEFAULT_GAME_MODE: SetGameModeOptions = { enabled: false, level: 3, sleepTime: 1 }

export class MockDongleDevice implements AulaDongleDevice {
  private rgb: ApplyRgbOptions = { ...DEFAULT_RGB }
  private performance: ApplyPerformanceOptions = { ...DEFAULT_PERFORMANCE }
  private gameMode: SetGameModeOptions = { ...DEFAULT_GAME_MODE }
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

  async setGameMode(options: SetGameModeOptions): Promise<void> {
    this.gameMode = { ...options }
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
      gameMode: { ...this.gameMode },
      batteryPercent: this.batteryPercent,
    }
  }
}
