import * as DocumentPicker from 'expo-document-picker'
import { Download, Upload } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useToast } from '@/context/ToastContext'
import { exportBackup, importBackup } from '@/lib/backup'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Data & Backup: export shares a .zip (PWA-compatible format),
// import merges one back in. Both live in src/lib/backup.ts.

type Props = {
  recordCount: number
  folderCount: number
  tagCount: number
  onChanged: () => void
}

export function DataSection({ recordCount, folderCount, tagCount, onChanged }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)

  const handleExport = async () => {
    if (busy) return
    haptic('light')
    setBusy('export')
    try {
      const count = await exportBackup()
      if (count === null) {
        showToast('Sharing is not available on this device')
      } else {
        haptic('success')
        showToast(`Backup ready — ${count} record${count !== 1 ? 's' : ''}`)
      }
    } catch (e) {
      // Full error stays in the log for debugging; the toast stays friendly
      console.error('[backup] export failed:', e)
      haptic('error')
      showToast('Export failed — could not build the backup')
    }
    setBusy(null)
  }

  const handleImport = async () => {
    if (busy) return
    haptic('light')
    setBusy('import')
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // Android file managers label zips inconsistently — accept the usual suspects
        type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
        // false → keep the content:// URI (the picker grants read access to it).
        // Copying to cache lands the file OUTSIDE Expo Go's scoped sandbox, where
        // neither FileSystem API is allowed to read it. See importBackup().
        copyToCacheDirectory: false,
        multiple: false,
      })
      if (picked.canceled || !picked.assets?.[0]) {
        setBusy(null)
        return
      }
      const result = await importBackup(picked.assets[0].uri)
      haptic('success')
      showToast(
        `Imported ${result.recordsImported} record${result.recordsImported !== 1 ? 's' : ''}, ` +
          `${result.foldersImported} folder${result.foldersImported !== 1 ? 's' : ''}, ` +
          `${result.tagsImported} tag${result.tagsImported !== 1 ? 's' : ''}`
      )
      onChanged()
    } catch (e) {
      // Full error stays in the log for debugging; the toast stays friendly
      console.error('[backup] import failed:', e)
      haptic('error')
      showToast('Import failed — is that file a Spark backup .zip?')
    }
    setBusy(null)
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
            onPress={handleExport}
            disabled={busy !== null}
            style={({ pressed }) => [
              styles.exportBtn,
              pressed && { opacity: 0.85 },
              busy !== null && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Export backup"
          >
            {busy === 'export' ? (
              <ActivityIndicator size="small" color={tokens.accentIconSoft} />
            ) : (
              <Download size={14} color={tokens.accentIconSoft} strokeWidth={2} />
            )}
            <Text style={[styles.exportText, { color: tokens.accentIconSoft }]}>
              {busy === 'export' ? 'Exporting…' : 'Export'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleImport}
            disabled={busy !== null}
            style={({ pressed }) => [
              styles.importBtn,
              { borderColor: tokens.borderStrong },
              pressed && { backgroundColor: tokens.surface },
              busy !== null && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Import backup"
          >
            {busy === 'import' ? (
              <ActivityIndicator size="small" color={tokens.textSecondary} />
            ) : (
              <Upload size={14} color={tokens.textSecondary} strokeWidth={2} />
            )}
            <Text style={[styles.importText, { color: tokens.textSecondary }]}>
              {busy === 'import' ? 'Importing…' : 'Import'}
            </Text>
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
