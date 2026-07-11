import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → About (PWA port, storage line updated for native).

const ROWS: [string, string][] = [
  ['Version', 'Spark 1.0'],
  ['Storage', 'On-device (SQLite)'],
  ['Account', 'None required'],
]

export function AboutSection() {
  const { tokens } = useTheme()
  return (
    <View>
      <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>ABOUT</Text>
      <View
        style={[styles.card, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}
      >
        {ROWS.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
            <Text style={[styles.value, { color: tokens.textSecondary }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 12,
  },
})
