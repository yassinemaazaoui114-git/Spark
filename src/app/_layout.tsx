import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { AppState, LogBox } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

// react-native-draggable-flatlist still uses the deprecated InteractionManager
// internally — harmless, out of our control, and absent from release builds.
// The "hasn't mounted yet" error comes from expo-router's useLinking initial-URL
// promise racing fast refresh (stack is 100% expo-router; never fires on cold
// start). Trade-off: if our own code ever causes this exact error, LogBox won't
// show it — the terminal still logs it, so it remains discoverable there.
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
  "Can't perform a React state update on a component that hasn't mounted yet",
])

import { LockScreen } from '@/components/LockScreen'
import { ToastProvider } from '@/context/ToastContext'
import { setPlaybackAudioMode } from '@/lib/audio-mode'
import { isBiometricEnabled } from '@/lib/biometric'
import { TRASH_RETENTION_MS, purgeOldDeleted } from '@/storage/trash'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'

// Re-lock only after a real absence — brief app switches (and the OS biometric
// sheet itself, which can flip AppState) shouldn't demand a fresh unlock.
const LOCK_AFTER_BACKGROUND_MS = 10_000

// Root gate: if biometric unlock is on, the app opens locked and re-locks when
// it comes back from a >10s background. Renders nothing until we know the flag
// so app content never flashes before the lock appears.
function BiometricGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const backgroundedAt = useRef<number | null>(null)

  useEffect(() => {
    isBiometricEnabled().then((enabled) => {
      setLocked(enabled)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now()
      } else if (state === 'active') {
        const since = backgroundedAt.current
        backgroundedAt.current = null
        if (since != null && Date.now() - since > LOCK_AFTER_BACKGROUND_MS) {
          isBiometricEnabled().then((enabled) => {
            if (enabled) setLocked(true)
          })
        }
      }
    })
    return () => sub.remove()
  }, [])

  if (!ready) return null

  return (
    <>
      {children}
      {locked && (
        <LockScreen
          onUnlocked={() => {
            // Discard any background stamp from the auth sheet so unlocking
            // can't immediately re-trigger the background re-lock.
            backgroundedAt.current = null
            setLocked(false)
          }}
        />
      )}
    </>
  )
}

function AppStack() {
  const { tokens } = useTheme()
  return (
    <>
      <StatusBar style={tokens.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.bgGradient[0] },
        }}
      />
    </>
  )
}

export default function RootLayout() {
  // App-wide audio session + trash auto-purge (items older than 30 days)
  useEffect(() => {
    setPlaybackAudioMode()
    purgeOldDeleted(Date.now() - TRASH_RETENTION_MS).catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <BiometricGate>
            <AppStack />
          </BiometricGate>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
