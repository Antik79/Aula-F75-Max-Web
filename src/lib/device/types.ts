export interface ApplyRgbOptions {
  mode: number
  brightness: number
  speed: number
  direction: number
  colorful: boolean
  color: number
}

export interface ApplyPerformanceOptions {
  level: number
  sleepTime: number
}

export interface SetGameModeOptions {
  enabled: boolean
  level: number
  sleepTime: number
}

export interface DisplayUploadProgress {
  sentChunks: number
  totalChunks: number
}

/** Talks to the 2.4G receiver: RGB, performance, game mode, battery. */
export interface AulaDongleDevice {
  applyRGB(options: ApplyRgbOptions): Promise<void>
  applyPerformance(options: ApplyPerformanceOptions): Promise<void>
  setGameMode(options: SetGameModeOptions): Promise<void>
  queryBattery(): Promise<number | null>
}

/** Talks to the wired keyboard: display upload, clock sync, factory reset. */
export interface AulaWiredDevice {
  syncTime(date?: Date): Promise<void>
  uploadDisplayStream(
    stream: Uint8Array,
    slot: number,
    onProgress: (progress: DisplayUploadProgress) => void,
  ): Promise<void>
  factoryReset(onProgress: (step: string) => void): Promise<void>
}
