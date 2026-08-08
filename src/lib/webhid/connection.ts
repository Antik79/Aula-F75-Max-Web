import { AulaConstants } from '@/lib/protocol'
import { AulaHidError } from './errors'
import { DongleAulaDevice } from './dongleDevice'
import { WiredAulaDevice } from './wiredDevice'
import type { HidPort } from './hidPort'

/**
 * A real WebHID HIDDevice satisfies HidPort at runtime, but TypeScript's
 * Uint8Array<ArrayBufferLike> vs. BufferSource<ArrayBuffer> generics don't
 * line up structurally. Narrow cast at this single boundary instead of
 * loosening types throughout the rest of the app.
 */
function toHidPort(device: HIDDevice): HidPort {
  return device as unknown as HidPort
}

export function isWebHidSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator
}

export function pickByUsagePage(devices: HIDDevice[], usagePage: number): HIDDevice | undefined {
  return devices.find((device) => device.collections.some((collection) => collection.usagePage === usagePage))
}

export function requestWiredDevices(): Promise<HIDDevice[]> {
  return navigator.hid.requestDevice({
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
}

export function requestDongleDevices(): Promise<HIDDevice[]> {
  return navigator.hid.requestDevice({
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
}

export function getGrantedDevices(): Promise<HIDDevice[]> {
  return navigator.hid.getDevices()
}

async function openIfNeeded(device: HIDDevice): Promise<void> {
  if (device.opened) return
  try {
    await device.open()
  } catch (cause) {
    throw new AulaHidError('open-failed', 'Could not open the HID device.', { cause })
  }
}

export interface WiredConnection {
  commandDevice: HIDDevice
  rawDevice: HIDDevice
  device: WiredAulaDevice
}

export async function connectWiredDevice(): Promise<WiredConnection> {
  const devices = await requestWiredDevices()
  if (devices.length === 0) {
    throw new AulaHidError('no-device-selected', 'No wired keyboard endpoint was selected.')
  }

  const commandDevice = pickByUsagePage(devices, AulaConstants.wiredCommandUsagePage)
  const rawDevice = pickByUsagePage(devices, AulaConstants.wiredRawUsagePage)
  if (!commandDevice || !rawDevice) {
    throw new AulaHidError(
      'endpoint-not-found',
      'Could not find both the wired command (0xff13) and display (0xff68) HID endpoints.',
    )
  }

  await openIfNeeded(commandDevice)
  await openIfNeeded(rawDevice)

  return {
    commandDevice,
    rawDevice,
    device: new WiredAulaDevice({ commandPort: toHidPort(commandDevice), rawPort: toHidPort(rawDevice) }),
  }
}

export interface DongleConnection {
  rawDevice: HIDDevice
  device: DongleAulaDevice
}

export async function connectDongleDevice(): Promise<DongleConnection> {
  const devices = await requestDongleDevices()
  if (devices.length === 0) {
    throw new AulaHidError('no-device-selected', 'No 2.4G receiver endpoint was selected.')
  }

  const rawDevice = pickByUsagePage(devices, AulaConstants.wirelessRawUsagePage) ?? devices[0]
  await openIfNeeded(rawDevice)

  return {
    rawDevice,
    device: new DongleAulaDevice(toHidPort(rawDevice)),
  }
}
