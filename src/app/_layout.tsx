import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { LogBox } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

// react-native-draggable-flatlist still uses the deprecated InteractionManager
// internally — harmless, out of our control, and absent from release builds.
LogBox.ignoreLogs(['InteractionManager has been deprecated'])

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
