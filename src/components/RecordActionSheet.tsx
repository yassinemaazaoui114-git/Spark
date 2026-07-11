import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  Folder as FolderIcon,
  Mic,
  Pencil,
  PenLine,
  Pin,
  PinOff,
  Scissors,
  Share2,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatDuration, formatTimestamp, stripStoredTimestampPrefix } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'
import type { VoiceRecord } from '@/types'

// Slide-up action sheet on a record (PWA long-press sheet): pin, rename,
// move, share/copy, trim (audio only), archive, delete + cancel.

type Props = {
  record: VoiceRecord | null
  visible: boolean
  onClose: () => void
  onPin: () => void
  onRename: () => void
  onMove: () => void
  onShare: () => void
  onTrim: () => void
  onArchive: () => void
  onDelete: () => void
  onSelect: () => void
}

type ActionRow = {
  key: string
  label: string
  Icon: LucideIcon
  chipColor: string
  iconColor: string
  danger?: boolean
  onPress: () => void
}

export function RecordActionSheet({
  record,
  visible,
  onClose,
  onPin,
  onRename,
  onMove,
  onShare,
  onTrim,
  onArchive,
  onDelete,
  onSelect,
}: Props) {
  const { tokens } = useTheme()
  const insets = useSafeAreaInsets()

  if (!record) return null
  const isTextNote = record.type === 'text'

  const actions: ActionRow[] = [
    {
      key: 'select',
      label: 'Select',
      Icon: CheckSquare,
      chipColor: 'rgba(139,92,246,0.15)',
      iconColor: '#c4b5fd',
      onPress: onSelect,
    },
    {
      key: 'pin',
      label: record.pinned ? 'Unpin from top' : 'Pin to top',
      Icon: record.pinned ? PinOff : Pin,
      chipColor: 'rgba(245,158,11,0.15)',
      iconColor: '#fcd34d',
      onPress: onPin,
    },
    {
      key: 'rename',
      label: 'Rename / edit tags',
      Icon: Pencil,
      chipColor: 'rgba(59,130,246,0.15)',
      iconColor: '#93c5fd',
      onPress: onRename,
    },
    {
      key: 'move',
      label: 'Move to folder',
      Icon: FolderIcon,
      chipColor: 'rgba(139,92,246,0.15)',
      iconColor: '#c4b5fd',
      onPress: onMove,
    },
    {
      key: 'share',
      label: isTextNote ? 'Copy text' : 'Share audio',
      Icon: Share2,
      chipColor: 'rgba(16,185,129,0.15)',
      iconColor: '#6ee7b7',
      onPress: onShare,
    },
    ...(!isTextNote
      ? [
          {
            key: 'trim',
            label: 'Trim audio',
            Icon: Scissors,
            chipColor: 'rgba(217,70,239,0.15)',
            iconColor: '#f0abfc',
            onPress: onTrim,
          } satisfies ActionRow,
        ]
      : []),
    {
      key: 'archive',
      label: record.archived ? 'Restore from archive' : 'Archive',
      Icon: record.archived ? ArchiveRestore : Archive,
      chipColor: 'rgba(113,113,122,0.15)',
      iconColor: record.archived ? '#6ee7b7' : '#d4d4d8',
      onPress: onArchive,
    },
    {
      key: 'delete',
      label: 'Delete',
      Icon: Trash2,
      chipColor: 'rgba(239,68,68,0.15)',
      iconColor: '#f87171',
      danger: true,
      onPress: onDelete,
    },
  ]

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.sheet,
              borderColor: tokens.sheetBorder,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Record header */}
          <View style={[styles.header, { borderBottomColor: tokens.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
              {isTextNote ? (
                <PenLine size={16} color="#c4b5fd" strokeWidth={2} />
              ) : (
                <Mic size={16} color="#c4b5fd" strokeWidth={2} />
              )}
            </View>
            <View style={styles.headerBody}>
              <View style={styles.headerNameRow}>
                {record.pinned && (
                  <Pin size={11} color={accent.amber} fill={accent.amber} strokeWidth={2} />
                )}
                <Text
                  style={[styles.headerName, { color: tokens.textPrimary }]}
                  numberOfLines={1}
                >
                  {stripStoredTimestampPrefix(record.name)}
                </Text>
              </View>
              <Text style={[styles.headerMeta, { color: tokens.textMuted }]}>
                {isTextNote ? 'Text note' : formatDuration(record.durationSec)} ·{' '}
                {formatTimestamp(record.createdAt)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => {
                  onClose()
                  a.onPress()
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && {
                    backgroundColor: a.danger ? 'rgba(239,68,68,0.1)' : tokens.surfaceSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <View style={[styles.actionChip, { backgroundColor: a.chipColor }]}>
                  <a.Icon size={16} color={a.iconColor} strokeWidth={2} />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: a.danger ? '#fca5a5' : tokens.textPrimary },
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Cancel */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: tokens.border },
              pressed && { backgroundColor: tokens.surfaceSubtle },
            ]}
          >
            <Text style={[styles.cancelText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  headerMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  actionChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
  },
})
