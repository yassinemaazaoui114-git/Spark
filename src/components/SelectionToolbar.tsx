import { Archive, ArchiveRestore, CheckCheck, FolderInput, Trash2, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FolderPickerList } from '@/components/FolderPickerList'
import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { useSelection } from '@/lib/selection'
import { getFolders } from '@/storage/folders'
import { batchMoveRecords, batchSetArchived } from '@/storage/records'
import { softDeleteRecords } from '@/storage/trash'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Floating batch-action toolbar shown while multi-select is active.
// Rendered by the home + folders screens (they own the refresh).

type Props = {
  onChanged: () => void
}

export function SelectionToolbar({ onChanged }: Props) {
  const { theme, tokens } = useTheme()
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()
  const sel = useSelection()

  const [showMove, setShowMove] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [confirmTrash, setConfirmTrash] = useState(false)

  if (!sel.isActive()) return null

  const count = sel.count()
  const unarchiveMode = sel.allArchived()

  const finish = (message: string) => {
    haptic('success')
    showToast(message)
    sel.exit()
    onChanged()
  }

  const handleArchive = async () => {
    const ids = sel.ids()
    if (ids.length === 0) return
    await batchSetArchived(ids, !unarchiveMode)
    finish(unarchiveMode ? `${ids.length} restored from archive` : `${ids.length} archived`)
  }

  const handleMove = async (folderId: string | null) => {
    const ids = sel.ids()
    if (folderId == null || ids.length === 0) return
    await batchMoveRecords(ids, folderId)
    setShowMove(false)
    finish(`${ids.length} moved`)
  }

  const handleTrash = async () => {
    const ids = sel.ids()
    setConfirmTrash(false)
    await softDeleteRecords(ids)
    haptic('warning')
    showToast(`${ids.length} moved to Recently Deleted`)
    sel.exit()
    onChanged()
  }

  return (
    <>
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme === 'light' ? '#ffffff' : 'rgba(24,24,27,0.95)',
              borderColor: tokens.borderStrong,
            },
          ]}
        >
          <Text style={[styles.count, { color: tokens.textPrimary }]}>{count} selected</Text>

          <ToolbarButton
            label="All"
            icon={<CheckCheck size={16} color={tokens.textSecondary} strokeWidth={2} />}
            onPress={() => {
              haptic('light')
              sel.selectAll()
            }}
          />
          <ToolbarButton
            label="Move"
            icon={<FolderInput size={16} color="#c4b5fd" strokeWidth={2} />}
            disabled={count === 0}
            onPress={async () => {
              haptic('light')
              setFolders(await getFolders())
              setShowMove(true)
            }}
          />
          <ToolbarButton
            label={unarchiveMode ? 'Restore' : 'Archive'}
            icon={
              unarchiveMode ? (
                <ArchiveRestore size={16} color="#6ee7b7" strokeWidth={2} />
              ) : (
                <Archive size={16} color="#d4d4d8" strokeWidth={2} />
              )
            }
            disabled={count === 0}
            onPress={() => {
              haptic('light')
              handleArchive()
            }}
          />
          <ToolbarButton
            label="Trash"
            icon={<Trash2 size={16} color="#fca5a5" strokeWidth={2} />}
            disabled={count === 0}
            onPress={() => {
              haptic('light')
              setConfirmTrash(true)
            }}
          />
          <ToolbarButton
            label="Cancel"
            icon={<X size={16} color={tokens.textMuted} strokeWidth={2} />}
            onPress={() => {
              haptic('light')
              sel.exit()
            }}
          />
        </View>
      </View>

      {/* Batch move */}
      <GlassDialog
        visible={showMove}
        onRequestClose={() => setShowMove(false)}
        title={`Move ${count} record${count !== 1 ? 's' : ''} to folder`}
      >
        <FolderPickerList folders={folders} selectedId={null} onSelect={handleMove} />
      </GlassDialog>

      {/* Batch trash confirm */}
      <ConfirmDialog
        visible={confirmTrash}
        title={`Move ${count} record${count !== 1 ? 's' : ''} to Recently Deleted?`}
        message="You can restore them from Settings → Recently Deleted for 30 days."
        confirmLabel="Move to Trash"
        destructive
        onConfirm={handleTrash}
        onCancel={() => setConfirmTrash(false)}
      />
    </>
  )
}

function ToolbarButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
  disabled?: boolean
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        pressed && { backgroundColor: tokens.surfaceSubtle },
        disabled && { opacity: 0.35 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.btnLabel, { color: tokens.textMuted }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  btn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  btnLabel: {
    fontSize: 9,
  },
})
