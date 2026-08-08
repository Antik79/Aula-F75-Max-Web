import { Toaster } from '@/components/ui/sonner'
import { ConnectionProvider, useConnection } from '@/state/connectionContext'
import { ConnectScreen } from '@/components/connect/ConnectScreen'
import { AppShell } from '@/components/AppShell'

function Root() {
  const { wiredStatus, dongleStatus } = useConnection()
  const anyConnected = wiredStatus === 'connected' || dongleStatus === 'connected'
  return anyConnected ? <AppShell /> : <ConnectScreen />
}

function App() {
  return (
    <ConnectionProvider>
      <Root />
      <Toaster theme="dark" />
    </ConnectionProvider>
  )
}

export default App
