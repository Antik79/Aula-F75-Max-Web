import { useEffect, useRef, useState } from 'react'
import { useConnection } from '@/state/connectionContext'

const POLL_INTERVAL_MS = 5 * 60 * 1000
const LOW_BATTERY_THRESHOLD = 20

function notifyLowBattery(percent: number) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification('Aula F75 Max battery low', { body: `${percent}% remaining — plug in the receiver's cable to charge.` })
  } else if (Notification.permission === 'default') {
    void Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Aula F75 Max battery low', { body: `${percent}% remaining.` })
      }
    })
  }
}

export function BatteryIndicator() {
  const { dongleDevice, dongleStatus } = useConnection()
  const [percent, setPercent] = useState<number | null>(null)
  const hasNotifiedLow = useRef(false)

  useEffect(() => {
    if (!dongleDevice || dongleStatus !== 'connected') return

    let cancelled = false

    const poll = async () => {
      const value = await dongleDevice.queryBattery().catch(() => null)
      if (cancelled || value === null) return
      setPercent(value)
      if (value <= LOW_BATTERY_THRESHOLD && !hasNotifiedLow.current) {
        hasNotifiedLow.current = true
        notifyLowBattery(value)
      } else if (value > LOW_BATTERY_THRESHOLD) {
        hasNotifiedLow.current = false
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [dongleDevice, dongleStatus])

  if (dongleStatus !== 'connected' || percent === null) return null

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground" title="Polled every 5 minutes while this tab is open">
      <span className={percent <= LOW_BATTERY_THRESHOLD ? 'text-destructive' : ''}>{percent}%</span>
      <span>battery</span>
    </div>
  )
}
