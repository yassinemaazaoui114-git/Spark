import { Shield } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Violet privacy banner — top of Settings (PWA port).

export function PrivacyBanner() {
  const { tokens } = useTheme()
  return (
    <View style={styles.card}>
      <View style={styles.iconChip}>
        <Shield size={16} color={tokens.accentIconSoft} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>
          Your data stays on your device
        </Text>
        <Text style={[styles.text, { color: tokens.textMuted }]}>
          Spark is local-first. All recordings, folders, and tags are stored only on this
          phone. Nothing is sent to any server. No account, no cloud, no tracking.
        </Text>
        <Text style={[styles.footnote, { color: tokens.textFaint }]}>
          Use Data & Backup below to export a copy regularly.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footnote: {
    fontSize: 10,
    marginTop: 8,
  },
})
