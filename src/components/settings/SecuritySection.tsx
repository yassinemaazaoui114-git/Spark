import { Check, Fingerprint, Lock, Shield } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useToast } from '@/context/ToastContext'
import {
  authenticate,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
} from '@/lib/biometric'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Security: biometric unlock (Step 30). Enabling runs a test
// authentication first so we never lock a user out with a flag they can't
// satisfy; the actual lock lives in the root layout's BiometricGate.

export function SecuritySection() {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      setAvailable(await isBiometricAvailable())
      setEnabled(await isBiometricEnabled())
      setLoading(true)
    })()
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    const ok = await authenticate()
    if (ok) {
      await setBiometricEnabled(true)
      setEnabled(true)
      haptic('success')
      showToast('Biometric unlock enabled')
    } else {
      haptic('error')
      showToast('Could not verify. Biometric unlock not enabled.')
    }
    setBusy(false)
  }

  const handleDisable = async () => {
    if (busy) return
    setBusy(true)
    // Require identity before turning the lock off — otherwise anyone holding
    // the unlocked phone could quietly disable it and walk back in later.
    const ok = await authenticate('Confirm to disable biometric unlock')
    if (ok) {
      await setBiometricEnabled(false)
      setEnabled(false)
      haptic('success')
      showToast('Biometric unlock disabled')
    } else {
      haptic('error')
      showToast('Could not verify. Biometric unlock stays on.')
    }
    setBusy(false)
  }

  const description = !loading
    ? 'Checking device…'
    : !available
      ? 'No fingerprint or face unlock is set up on this device.'
      : enabled
        ? 'Spark asks for your fingerprint or face each time you open it.'
        : 'Require fingerprint or face unlock when you open the app.'

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Lock size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>SECURITY</Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconChip,
              { backgroundColor: enabled ? tokens.accentTint : tokens.surface },
            ]}
          >
            <Fingerprint
              size={18}
              color={enabled ? tokens.accentIconSoft : tokens.textSecondary}
              strokeWidth={2}
            />
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Biometric unlock</Text>
            <Text style={[styles.desc, { color: tokens.textMuted }]}>{description}</Text>
          </View>
        </View>

        {loading && available && (
          enabled ? (
            <Pressable
              onPress={() => {
                if (busy) return
                haptic('light')
                handleDisable()
              }}
              disabled={busy}
              style={({ pressed }) => [
                styles.disableBtn,
                { borderColor: tokens.border },
                pressed && { backgroundColor: tokens.surface },
                busy && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Disable biometric unlock"
            >
              {busy ? (
                <ActivityIndicator size="small" color={tokens.accentIconSoft} />
              ) : (
                <Check size={14} color={tokens.accentIconSoft} strokeWidth={2} />
              )}
              <Text style={[styles.disableText, { color: tokens.textSecondary }]}>
                {busy ? 'Verifying…' : 'Enabled · tap to disable'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (busy) return
                haptic('light')
                handleEnable()
              }}
              disabled={busy}
              style={({ pressed }) => [
                styles.enableBtn,
                { backgroundColor: tokens.accentTintStrong, borderColor: tokens.accentBorder },
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Enable biometric unlock"
            >
              {busy ? (
                <ActivityIndicator size="small" color={tokens.accentIconSoft} />
              ) : (
                <Shield size={14} color={tokens.accentIconSoft} strokeWidth={2} />
              )}
              <Text style={[styles.enableText, { color: tokens.accentIconSoft }]}>
                {busy ? 'Verifying…' : 'Enable biometric unlock'}
              </Text>
            </Pressable>
          )
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  desc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  enableText: {
    fontSize: 13,
  },
  disableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  disableText: {
    fontSize: 13,
  },
})
