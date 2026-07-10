import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { useTheme } from '@/theme/ThemeContext'
import { radius } from '@/theme/tokens'

// Global toast — the PWA's bottom-center dark pill, auto-dismissed after 2.5s.

const TOAST_DURATION = 2500
const FADE_MS = 200

type ToastContextValue = {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const opacity = useSharedValue(0)

  const showToast = useCallback(
    (msg: string) => {
      setMessage(msg)
      opacity.value = withTiming(1, { duration: FADE_MS })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: FADE_MS })
        // Clear the text after the fade-out finishes
        timerRef.current = setTimeout(() => setMessage(null), FADE_MS)
      }, TOAST_DURATION)
    },
    [opacity]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message != null && <ToastPill message={message} opacity={opacity} />}
    </ToastContext.Provider>
  )
}

function ToastPill({
  message,
  opacity,
}: {
  message: string
  opacity: { value: number }
}) {
  const { theme } = useTheme()
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (opacity as any).value,
  }))

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor:
              theme === 'light' ? 'rgba(26,11,46,0.9)' : 'rgba(0,0,0,0.8)',
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Sits just above the floating tab bar
    bottom: 110,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
  },
})
