import { Fingerprint } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { useToast } from '@/context/ToastContext'
import { authenticate } from '@/lib/biometric'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'

// Full-screen biometric lock (Step 30). Rendered on top of everything while
// the app is locked; the OS biometric sheet pops on mount and on every tap of
// the fingerprint. There is deliberately no "disable" escape here — that would
// let anyone bypass the lock without authenticating; disabling lives in
// Settings (reachable only after unlocking), and the OS device-passcode
// fallback prevents a permanent lockout if biometrics ever fail.

type Props = {
  onUnlocked: () => void
}

export function LockScreen({ onUnlocked }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [verifying, setVerifying] = useState(false)
  const didAutoPrompt = useRef(false)

  const attempt = async () => {
    if (verifying) return
    setVerifying(true)
    const ok = await authenticate()
    setVerifying(false)
    if (ok) {
      haptic('success')
      onUnlocked()
    } else {
      haptic('error')
      showToast('Verification failed. Try again.')
    }
  }

  // Pop the OS sheet automatically the first time the lock appears.
  useEffect(() => {
    if (didAutoPrompt.current) return
    didAutoPrompt.current = true
    attempt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Pressable
            onPress={() => {
              haptic('light')
              attempt()
            }}
            disabled={verifying}
            style={({ pressed }) => [
              styles.fingerBtn,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.borderStrong,
              },
              pressed && { transform: [{ scale: 0.95 }] },
              verifying && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Unlock with biometric"
          >
            {verifying ? (
              <ActivityIndicator size="large" color={tokens.accentIconSoft} />
            ) : (
              <Fingerprint size={48} color={tokens.accentIconSoft} strokeWidth={1.5} />
            )}
          </Pressable>

          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            {verifying ? 'Verifying…' : 'Spark is locked'}
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            {verifying
              ? 'Hold still while we verify your identity.'
              : 'Tap the fingerprint to unlock with your face or finger.'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fingerBtn: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 260,
  },
})
