import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

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
    <ThemeProvider>
      <ToastProvider>
        <AppStack />
      </ToastProvider>
    </ThemeProvider>
  )
}
