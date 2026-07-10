import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { LogBox } from 'react-native'
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

import { ToastProvider } from '@/context/ToastContext'
import { setPlaybackAudioMode } from '@/lib/audio-mode'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'

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
  // App-wide audio session: silent-switch playback + background playback
  useEffect(() => {
    setPlaybackAudioMode()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <AppStack />
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
