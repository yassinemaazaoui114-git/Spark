import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { ToastProvider } from '@/context/ToastContext'
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
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppStack />
      </ToastProvider>
    </ThemeProvider>
  )
}
