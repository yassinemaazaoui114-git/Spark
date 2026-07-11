import { Fingerprint, Lock, Shield } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Security: biometric unlock (functional in Step 30).

export function SecuritySection() {
  const { tokens } = useTheme()
  const { showToast } = useToast()

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
          <View style={[styles.iconChip, { backgroundColor: tokens.surface }]}>
            <Fingerprint size={18} color={tokens.textSecondary} strokeWidth={2} />
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Biometric unlock</Text>
            <Text style={[styles.desc, { color: tokens.textMuted }]}>
              Require fingerprint or face unlock when you open the app.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            haptic('light')
            showToast('Biometric unlock arrives in Step 30')
          }}
          style={({ pressed }) => [styles.enableBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Enable biometric unlock"
        >
          <Shield size={14} color="#ddd6fe" strokeWidth={2} />
          <Text style={styles.enableText}>Enable biometric unlock</Text>
        </Pressable>
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
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  enableText: {
    fontSize: 13,
    color: '#ddd6fe',
  },
})
