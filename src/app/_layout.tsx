import type { NotificationResponse } from 'expo-notifications'
import { Stack, router } from 'expo-router'
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
import { Onboarding } from '@/components/Onboarding'
import { ToastProvider } from '@/context/ToastContext'
import { setPlaybackAudioMode } from '@/lib/audio-mode'
import { isBiometricEnabled } from '@/lib/biometric'
import {
  cleanupExpiredReminders,
  getNotifications,
  refreshReminderIds,
  setPendingOpenRecord,
} from '@/lib/reminders'
import { PREF_KEYS, getPref, setPref } from '@/storage/prefs'
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

// First-open tutorial (Step 32). Shown once, over the app; the biometric lock
// (zIndex above it) still covers everything if both are active.
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    getPref(PREF_KEYS.onboarded).then((v) => {
      if (v !== '1') setShow(true)
    })
  }, [])

  return (
    <>
      {children}
      {show && (
        <Onboarding
          onDone={() => {
            setShow(false)
            setPref(PREF_KEYS.onboarded, '1')
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
  // App-wide audio session, trash auto-purge (30 days), fired-reminder sweep
  useEffect(() => {
    setPlaybackAudioMode()
    purgeOldDeleted(Date.now() - TRASH_RETENTION_MS).catch(() => {})
    cleanupExpiredReminders().catch(() => refreshReminderIds().catch(() => {}))
  }, [])

  // Reminder taps → home tab + hand the recordId to the home screen.
  // getLast... covers cold start (the tap launched the app); the listener
  // covers taps while running. getNotifications() is null in Expo Go
  // (expo-notifications can't even load there) — reminders are dev-build only.
  useEffect(() => {
    const Notifications = getNotifications()
    if (!Notifications) return
    // Reminder notifications must show even while Spark is foregrounded
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    const openFromResponse = (response: NotificationResponse | null) => {
      const recordId = response?.notification.request.content.data?.recordId
      if (typeof recordId === 'string') {
        setPendingOpenRecord(recordId)
        router.navigate('/')
      }
    }
    Notifications.getLastNotificationResponseAsync()
      .then(openFromResponse)
      .catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse)
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <BiometricGate>
            <OnboardingGate>
              <AppStack />
            </OnboardingGate>
          </BiometricGate>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
