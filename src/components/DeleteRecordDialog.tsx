import { Hash, Trash2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { formatDuration, formatTimestamp, stripStoredTimestampPrefix } from '@/storage/format'
import { softDeleteRecord } from '@/storage/trash'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { VoiceRecord } from '@/types'

// Delete confirmation with record preview — moves the record to Recently
// Deleted (30-day soft delete). Permanent deletion happens in the trash view.

type Props = {
  record: VoiceRecord | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteRecordDialog({ record, onClose, onDeleted }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const handleDelete = async () => {
    if (!record) return
    try {
      await softDeleteRecord(record.id)
      haptic('warning')
      showToast('Moved to Recently Deleted')
      onDeleted()
    } catch {
      haptic('error')
      showToast('Could not delete')
      onClose()
    }
  }

  return (
    <GlassDialog
      visible={!!record}
      onRequestClose={onClose}
      title="Move to Recently Deleted?"
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
          >
            <Trash2 size={15} color="#ffffff" strokeWidth={2} />
            <Text style={styles.deleteText}>Move to Trash</Text>
          </Pressable>
        </>
      }
    >
      {record && (
        <>
          <View
            style={[
              styles.preview,
              { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
            ]}
          >
            <Text style={[styles.previewName, { color: tokens.textPrimary }]} numberOfLines={1}>
              {stripStoredTimestampPrefix(record.name)}
            </Text>
            <Text style={[styles.previewMeta, { color: tokens.textMuted }]}>
              {record.type === 'text' ? 'Text note' : formatDuration(record.durationSec)} ·{' '}
              {formatTimestamp(record.createdAt)}
            </Text>
            {record.tags.length > 0 && (
              <View style={styles.tagRow}>
                {record.tags.map((t) => (
                  <View key={t} style={styles.tagChip}>
                    <Hash size={8} color={tokens.accentText} strokeWidth={2} />
                    <Text style={[styles.tagText, { color: tokens.accentText }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Text style={[styles.warning, { color: tokens.textMuted }]}>
            You can restore it from Settings → Recently Deleted for 30 days. After that it is
            removed forever.
          </Text>
        </>
      )}
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  tagText: {
    fontSize: 10,
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
  },
  ghostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  ghostBtnText: {
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#dc2626',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
