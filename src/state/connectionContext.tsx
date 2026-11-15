import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AulaDongleDevice, AulaWiredDevice } from '@/lib/device/types'
import { connectDongleDevice, connectWiredDevice, isWebHidSupported } from '@/lib/webhid/connection'
import { AulaHidError } from '@/lib/webhid/errors'
import { MockDongleDevice } from '@/lib/mock/mockDongleDevice'
import { MockWiredDevice } from '@/lib/mock/mockWiredDevice'
import { errorMessage, logActivity } from '@/lib/activity/log'
import { withDongleLogging, withWiredLogging } from '@/lib/activity/instrument'

export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionError {
  message: string
  showUdevHint: boolean
}

interface ConnectionContextValue {
  mode: 'hardware' | 'demo'
  wiredStatus: DeviceStatus
  dongleStatus: DeviceStatus
  wiredError: ConnectionError | null
  dongleError: ConnectionError | null
  wiredDevice: AulaWiredDevice | null
  dongleDevice: AulaDongleDevice | null
  webHidSupported: boolean
  connectWired: () => void
  connectDongle: () => void
  startDemoMode: () => void
  liveAccent: string
  setLiveAccent: (cssColor: string) => void
}

const DEFAULT_ACCENT = '#e0a458'

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

function describeError(error: unknown): ConnectionError {
  if (error instanceof AulaHidError) {
    return { message: error.message, showUdevHint: error.kind === 'open-failed' || error.kind === 'endpoint-not-found' }
  }
  if (error instanceof Error) {
    return { message: error.message, showUdevHint: false }
  }
  return { message: 'Something went wrong while connecting.', showUdevHint: false }
}

const hex4 = (n: number) => n.toString(16).padStart(4, '0')

function describeHidDevice(device: HIDDevice): string {
  const pages = device.collections.map((c) => `0x${hex4(c.usagePage ?? 0)}`).join(', ')
  return `"${device.productName}" ${hex4(device.vendorId)}:${hex4(device.productId)}, usage pages ${pages || 'none'}`
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'hardware' | 'demo'>('hardware')
  const [wiredStatus, setWiredStatus] = useState<DeviceStatus>('disconnected')
  const [dongleStatus, setDongleStatus] = useState<DeviceStatus>('disconnected')
  const [wiredError, setWiredError] = useState<ConnectionError | null>(null)
  const [dongleError, setDongleError] = useState<ConnectionError | null>(null)
  const [wiredDevice, setWiredDevice] = useState<AulaWiredDevice | null>(null)
  const [dongleDevice, setDongleDevice] = useState<AulaDongleDevice | null>(null)
  const [liveAccent, setLiveAccent] = useState(DEFAULT_ACCENT)

  // Log unplugs. Doesn't change connection state: the next command fails and
  // reports it, and the user can reconnect from the connect screen.
  useEffect(() => {
    if (!isWebHidSupported()) return
    const onDisconnect = (event: HIDConnectionEvent) =>
      logActivity('app', 'warn', `Device disconnected: ${describeHidDevice(event.device)}`)
    navigator.hid.addEventListener('disconnect', onDisconnect)
    return () => navigator.hid.removeEventListener('disconnect', onDisconnect)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--live-accent', liveAccent)
  }, [liveAccent])

  const connectWired = useCallback(() => {
    setWiredStatus('connecting')
    setWiredError(null)
    logActivity('wired', 'info', 'Connecting…')
    connectWiredDevice()
      .then((connection) => {
        logActivity('wired', 'info', `Connected: command ${describeHidDevice(connection.commandDevice)}`)
        logActivity('wired', 'info', `Connected: display ${describeHidDevice(connection.rawDevice)}`)
        setWiredDevice(withWiredLogging(connection.device))
        setWiredStatus('connected')
      })
      .catch((error: unknown) => {
        logActivity('wired', 'error', `Connect failed: ${errorMessage(error)}`)
        setWiredError(describeError(error))
        setWiredStatus('error')
      })
  }, [])

  const connectDongle = useCallback(() => {
    setDongleStatus('connecting')
    setDongleError(null)
    logActivity('dongle', 'info', 'Connecting…')
    connectDongleDevice()
      .then((connection) => {
        logActivity('dongle', 'info', `Connected: ${describeHidDevice(connection.rawDevice)}`)
        setDongleDevice(withDongleLogging(connection.device))
        setDongleStatus('connected')
      })
      .catch((error: unknown) => {
        logActivity('dongle', 'error', `Connect failed: ${errorMessage(error)}`)
        setDongleError(describeError(error))
        setDongleStatus('error')
      })
  }, [])

  const startDemoMode = useCallback(() => {
    logActivity('app', 'info', 'Demo mode started (no keyboard involved)')
    setMode('demo')
    setWiredDevice(withWiredLogging(new MockWiredDevice()))
    setDongleDevice(withDongleLogging(new MockDongleDevice()))
    setWiredStatus('connected')
    setDongleStatus('connected')
    setWiredError(null)
    setDongleError(null)
  }, [])

  const value = useMemo<ConnectionContextValue>(
    () => ({
      mode,
      wiredStatus,
      dongleStatus,
      wiredError,
      dongleError,
      wiredDevice,
      dongleDevice,
      webHidSupported: isWebHidSupported(),
      connectWired,
      connectDongle,
      startDemoMode,
      liveAccent,
      setLiveAccent,
    }),
    [
      mode,
      wiredStatus,
      dongleStatus,
      wiredError,
      dongleError,
      wiredDevice,
      dongleDevice,
      connectWired,
      connectDongle,
      startDemoMode,
      liveAccent,
    ],
  )

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}

export function useConnection(): ConnectionContextValue {
  const context = useContext(ConnectionContext)
  if (!context) throw new Error('useConnection must be used within a ConnectionProvider')
  return context
}
