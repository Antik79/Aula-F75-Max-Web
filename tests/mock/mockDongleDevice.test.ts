import { describe, expect, it } from 'vitest'
import { MockDongleDevice } from '@/lib/mock/mockDongleDevice'

describe('MockDongleDevice.applyRGB', () => {
  it('records the applied RGB state', async () => {
    const device = new MockDongleDevice()

    await device.applyRGB({ mode: 3, brightness: 4, speed: 2, direction: 1, colorful: true, color: 0xff00aa })

    expect(device.getState().rgb).toEqual({
      mode: 3,
      brightness: 4,
      speed: 2,
      direction: 1,
      colorful: true,
      color: 0xff00aa,
    })
  })
})

describe('MockDongleDevice.applyPerformance', () => {
  it('records the applied performance state', async () => {
    const device = new MockDongleDevice()

    await device.applyPerformance({ level: 5, sleepTime: 2 })

    expect(device.getState().performance).toEqual({ level: 5, sleepTime: 2 })
  })
})

describe('MockDongleDevice.setGameMode', () => {
  it('records the game mode state', async () => {
    const device = new MockDongleDevice()

    await device.setGameMode({ enabled: true, level: 3, sleepTime: 1 })

    expect(device.getState().gameMode).toEqual({ enabled: true, level: 3, sleepTime: 1 })
  })
})

describe('MockDongleDevice.queryBattery', () => {
  it('starts at the configured battery level', async () => {
    const device = new MockDongleDevice({ initialBatteryPercent: 80 })

    await expect(device.queryBattery()).resolves.toBe(80)
  })

  it('drains by one percent on each query, never going below 1', async () => {
    const device = new MockDongleDevice({ initialBatteryPercent: 2 })

    expect(await device.queryBattery()).toBe(2)
    expect(await device.queryBattery()).toBe(1)
    expect(await device.queryBattery()).toBe(1)
  })
})
