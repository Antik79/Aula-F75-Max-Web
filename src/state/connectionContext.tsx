import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AulaDongleDevice, AulaWiredDevice } from '@/lib/device/types'
import { connectDongleDevice, connectWiredDevice, isWebHidSupported } from '@/lib/webhid/connection'
import { AulaHidError } from '@/lib/webhid/errors'
import { MockDongleDevice } from '@/lib/mock/mockDongleDevice'
import { MockWiredDevice } from '@/lib/mock/mockWiredDevice'

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

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'hardware' | 'demo'>('hardware')
  const [wiredStatus, setWiredStatus] = useState<DeviceStatus>('disconnected')
  const [dongleStatus, setDongleStatus] = useState<DeviceStatus>('disconnected')
  const [wiredError, setWiredError] = useState<ConnectionError | null>(null)
  const [dongleError, setDongleError] = useState<ConnectionError | null>(null)
  const [wiredDevice, setWiredDevice] = useState<AulaWiredDevice | null>(null)
  const [dongleDevice, setDongleDevice] = useState<AulaDongleDevice | null>(null)
  const [liveAccent, setLiveAccent] = useState(DEFAULT_ACCENT)

  useEffect(() => {
    document.documentElement.style.setProperty('--live-accent', liveAccent)
  }, [liveAccent])

  const connectWired = useCallback(() => {
    setWiredStatus('connecting')
    setWiredError(null)
    connectWiredDevice()
      .then((connection) => {
        setWiredDevice(connection.device)
        setWiredStatus('connected')
      })
      .catch((error: unknown) => {
        setWiredError(describeError(error))
        setWiredStatus('error')
      })
  }, [])

  const connectDongle = useCallback(() => {
    setDongleStatus('connecting')
    setDongleError(null)
    connectDongleDevice()
      .then((connection) => {
        setDongleDevice(connection.device)
        setDongleStatus('connected')
      })
      .catch((error: unknown) => {
        setDongleError(describeError(error))
        setDongleStatus('error')
      })
  }, [])

  const startDemoMode = useCallback(() => {
    setMode('demo')
    setWiredDevice(new MockWiredDevice())
    setDongleDevice(new MockDongleDevice())
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
