import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connectDongleDevice,
  connectWiredDevice,
  isWebHidSupported,
  pickByUsagePage,
  requestDongleDevices,
  requestWiredDevices,
} from '@/lib/webhid/connection'
import { AulaConstants } from '@/lib/protocol'
import { AulaHidError } from '@/lib/webhid/errors'

function fakeDevice(usagePage: number, overrides: Partial<HIDDevice> = {}): HIDDevice {
  return {
    opened: false,
    collections: [{ usagePage } as HIDCollectionInfo],
    open: vi.fn(async function (this: HIDDevice) {
      // @ts-expect-error test double mutates a readonly-in-spec field
      this.opened = true
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    sendFeatureReport: vi.fn(),
    receiveFeatureReport: vi.fn(),
    sendReport: vi.fn(),
    ...overrides,
  } as unknown as HIDDevice
}

describe('isWebHidSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is false when navigator.hid is unavailable', () => {
    vi.stubGlobal('navigator', {})
    expect(isWebHidSupported()).toBe(false)
  })

  it('is true when navigator.hid exists', () => {
    vi.stubGlobal('navigator', { hid: {} })
    expect(isWebHidSupported()).toBe(true)
  })
})

describe('pickByUsagePage', () => {
  it('finds the device whose collection matches the usage page', () => {
    const command = fakeDevice(AulaConstants.wiredCommandUsagePage)
    const raw = fakeDevice(AulaConstants.wiredRawUsagePage)

    expect(pickByUsagePage([command, raw], AulaConstants.wiredRawUsagePage)).toBe(raw)
  })

  it('returns undefined when nothing matches', () => {
    const command = fakeDevice(AulaConstants.wiredCommandUsagePage)
    expect(pickByUsagePage([command], 0x9999)).toBeUndefined()
  })
})

describe('requestWiredDevices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests both the wired command and raw usage pages for the wired VID/PID', async () => {
    const requestDevice = vi.fn().mockResolvedValue([])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    await requestWiredDevices()

    expect(requestDevice).toHaveBeenCalledWith({
      filters: [
        {
          vendorId: AulaConstants.wiredVendorId,
          productId: AulaConstants.wiredProductId,
          usagePage: AulaConstants.wiredCommandUsagePage,
        },
        {
          vendorId: AulaConstants.wiredVendorId,
          productId: AulaConstants.wiredProductId,
          usagePage: AulaConstants.wiredRawUsagePage,
        },
      ],
    })
  })
})

describe('requestDongleDevices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests both the wireless command and raw usage pages for the dongle VID/PID', async () => {
    const requestDevice = vi.fn().mockResolvedValue([])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    await requestDongleDevices()

    expect(requestDevice).toHaveBeenCalledWith({
      filters: [
        {
          vendorId: AulaConstants.dongleVendorId,
          productId: AulaConstants.dongleProductId,
          usagePage: AulaConstants.wirelessCommandUsagePage,
        },
        {
          vendorId: AulaConstants.dongleVendorId,
          productId: AulaConstants.dongleProductId,
          usagePage: AulaConstants.wirelessRawUsagePage,
        },
      ],
    })
  })
})

describe('connectWiredDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens both endpoints and returns a ready WiredAulaDevice', async () => {
    const command = fakeDevice(AulaConstants.wiredCommandUsagePage)
    const raw = fakeDevice(AulaConstants.wiredRawUsagePage)
    const requestDevice = vi.fn().mockResolvedValue([command, raw])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    const connection = await connectWiredDevice()

    expect(command.open).toHaveBeenCalled()
    expect(raw.open).toHaveBeenCalled()
    expect(connection.device).toBeDefined()
  })

  it('throws AulaHidError when the picker is dismissed with no devices', async () => {
    const requestDevice = vi.fn().mockResolvedValue([])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    await expect(connectWiredDevice()).rejects.toThrow(AulaHidError)
  })

  it('throws AulaHidError when only one of the two endpoints is granted', async () => {
    const command = fakeDevice(AulaConstants.wiredCommandUsagePage)
    const requestDevice = vi.fn().mockResolvedValue([command])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    await expect(connectWiredDevice()).rejects.toThrow(AulaHidError)
  })

  it('wraps a device.open() failure in an open-failed AulaHidError', async () => {
    const openError = new DOMException('Access denied', 'SecurityError')
    const command = fakeDevice(AulaConstants.wiredCommandUsagePage, {
      open: vi.fn().mockRejectedValue(openError),
    })
    const raw = fakeDevice(AulaConstants.wiredRawUsagePage)
    const requestDevice = vi.fn().mockResolvedValue([command, raw])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    const error = await connectWiredDevice().catch((e) => e)

    expect(error).toBeInstanceOf(AulaHidError)
    expect(error.kind).toBe('open-failed')
    expect(error.cause).toBe(openError)
  })
})

describe('connectDongleDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens the raw endpoint and returns a ready DongleAulaDevice', async () => {
    const raw = fakeDevice(AulaConstants.wirelessRawUsagePage)
    const requestDevice = vi.fn().mockResolvedValue([raw])
    vi.stubGlobal('navigator', { hid: { requestDevice } })

    const connection = await connectDongleDevice()

    expect(raw.open).toHaveBeenCalled()
    expect(connection.device).toBeDefined()
  })
})
