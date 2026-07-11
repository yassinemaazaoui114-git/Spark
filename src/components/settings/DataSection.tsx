import { Download, Upload } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Data & Backup: export/import (functional in Step 31).

type Props = {
  recordCount: number
  folderCount: number
  tagCount: number
}

export function DataSection({ recordCount, folderCount, tagCount }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const placeholder = () => {
    haptic('light')
    showToast('Backup arrives in Step 31')
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Download size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>DATA & BACKUP</Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}
      >
        <Text style={[styles.desc, { color: tokens.textMuted }]}>
          Your data lives only on this device. Export a backup regularly so you never lose
          your thoughts.
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            onPress={placeholder}
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Export backup"
          >
            <Download size={14} color="#ddd6fe" strokeWidth={2} />
            <Text style={styles.exportText}>Export</Text>
          </Pressable>
          <Pressable
            onPress={placeholder}
            style={({ pressed }) => [
              styles.importBtn,
              { borderColor: tokens.borderStrong },
              pressed && { backgroundColor: tokens.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Import backup"
          >
            <Upload size={14} color={tokens.textSecondary} strokeWidth={2} />
            <Text style={[styles.importText, { color: tokens.textSecondary }]}>Import</Text>
          </Pressable>
        </View>
        <Text style={[styles.counts, { color: tokens.textFaint }]}>
          {recordCount} record{recordCount !== 1 ? 's' : ''} · {folderCount} folder
          {folderCount !== 1 ? 's' : ''} · {tagCount} tag{tagCount !== 1 ? 's' : ''}
        </Text>
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
  desc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  exportText: {
    fontSize: 13,
    color: '#ddd6fe',
  },
  importBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  importText: {
    fontSize: 13,
  },
  counts: {
    fontSize: 10,
    marginTop: spacing.md,
  },
})
