import { useRouter } from 'expo-router'
import {
  ArchiveRestore,
  ChevronLeft,
  Folder as FolderIcon,
  PenLine,
  Trash2,
} from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FlipAvatar } from '@/components/FlipAvatar'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { getFolders } from '@/storage/folders'
import { formatRelativeTime, stripStoredTimestampPrefix } from '@/storage/format'
import {
  emptyTrash,
  getDeletedFolders,
  getDeletedRecords,
  permanentlyDeleteFolder,
  permanentlyDeleteRecord,
  restoreFolder,
  restoreRecord,
} from '@/storage/trash'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

// Recently Deleted (Trash) screen — soft-deleted folders + records with
// Restore / Delete Forever per row and Empty Trash at the top.

export default function TrashScreen() {
  const { theme, tokens } = useTheme()
  const { showToast } = useToast()
  const router = useRouter()

  const [records, setRecords] = useState<VoiceRecord[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [allFolders, setAllFolders] = useState<Folder[]>([]) // incl. deleted, for name lookups
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [foreverRecord, setForeverRecord] = useState<VoiceRecord | null>(null)
  const [foreverFolder, setForeverFolder] = useState<Folder | null>(null)

  // Batch selection (records only)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchForever, setConfirmBatchForever] = useState(false)

  const toggleSelected = (id: string) => {
    haptic('light')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // True Gmail behavior here (no play button to protect): a single tap on a
  // row's icon starts selection with that record.
  const avatarPress = (id: string) => {
    if (!selecting) {
      haptic('medium')
      setSelecting(true)
      setSelectedIds(new Set([id]))
      return
    }
    toggleSelected(id)
  }

  const exitSelection = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  const handleBatchRestore = async () => {
    const ids = [...selectedIds]
    for (const id of ids) {
      await restoreRecord(id)
    }
    haptic('success')
    showToast(`${ids.length} restored`)
    exitSelection()
    refresh()
  }

  const handleBatchForever = async () => {
    setConfirmBatchForever(false)
    const ids = [...selectedIds]
    for (const id of ids) {
      await permanentlyDeleteRecord(id)
    }
    haptic('warning')
    showToast(`${ids.length} deleted forever`)
    exitSelection()
    refresh()
  }

  const refresh = useCallback(async () => {
    setRecords(await getDeletedRecords())
    setFolders(await getDeletedFolders())
    setAllFolders(await getFolders(true))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const folderName = (id: string) => {
    const f = allFolders.find((x) => x.id === id)
    if (!f) return 'Unknown'
    return f.deletedAt != null ? `${f.name} (in trash)` : f.name
  }

  const isEmpty = records.length === 0 && folders.length === 0

  const handleRestoreRecord = async (r: VoiceRecord) => {
    await restoreRecord(r.id)
    haptic('success')
    showToast('Restored')
    refresh()
  }

  const handleRestoreFolder = async (f: Folder) => {
    await restoreFolder(f.id)
    haptic('success')
    showToast('Folder and its records restored')
    refresh()
  }

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeft size={20} color={tokens.textPrimary} strokeWidth={2} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Recently Deleted</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
              Items are removed forever after 30 days
            </Text>
          </View>
          {!isEmpty && !selecting && records.length > 0 && (
            <Pressable
              onPress={() => {
                haptic('light')
                setSelecting(true)
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Select records"
            >
              <Text style={[styles.headerLink, { color: tokens.textMuted }]}>Select</Text>
            </Pressable>
          )}
          {!isEmpty && !selecting && (
            <Pressable
              onPress={() => {
                haptic('light')
                setConfirmEmpty(true)
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Empty trash"
            >
              <Text style={styles.emptyTrashLink}>Empty Trash</Text>
            </Pressable>
          )}
          {selecting && (
            <Pressable onPress={exitSelection} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.headerLink, { color: tokens.textMuted }]}>Cancel</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isEmpty ? (
            <View style={styles.emptyState}>
              <Trash2 size={32} color={tokens.textFaint} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: tokens.textSecondary }]}>
                Nothing in the trash
              </Text>
              <Text style={[styles.emptyMessage, { color: tokens.textMuted }]}>
                Deleted records and folders stay here for 30 days before being removed forever.
              </Text>
            </View>
          ) : (
            <>
              {/* Deleted folders */}
              {folders.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: tokens.textFaint }]}>FOLDERS</Text>
                  <View style={styles.list}>
                    {folders.map((f) => {
                      const inside = records.filter((r) => r.folderId === f.id).length
                      return (
                        <TrashRow
                          key={f.id}
                          icon={<FolderIcon size={16} color={f.color} strokeWidth={2} />}
                          iconBg={`${f.color}30`}
                          name={f.name}
                          meta={`${inside} record${inside !== 1 ? 's' : ''} inside · deleted ${formatRelativeTime(f.deletedAt ?? Date.now())}`}
                          onRestore={() => handleRestoreFolder(f)}
                          onForever={() => setForeverFolder(f)}
                        />
                      )
                    })}
                  </View>
                </>
              )}

              {/* Deleted records */}
              {records.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.groupLabel,
                      { color: tokens.textFaint },
                      folders.length > 0 && { marginTop: spacing.lg },
                    ]}
                  >
                    RECORDS
                  </Text>
                  <View style={styles.list}>
                    {records.map((r) => (
                      <TrashRow
                        key={r.id}
                        icon={
                          r.type === 'text' ? (
                            <PenLine size={16} color={tokens.blueIcon} strokeWidth={2} />
                          ) : (
                            <Trash2
                              size={16}
                              color={theme === 'light' ? '#dc2626' : '#fca5a5'}
                              strokeWidth={2}
                            />
                          )
                        }
                        iconBg={
                          r.type === 'text' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'
                        }
                        name={stripStoredTimestampPrefix(r.name)}
                        meta={`${folderName(r.folderId)} · deleted ${formatRelativeTime(r.deletedAt ?? Date.now())}`}
                        onRestore={() => handleRestoreRecord(r)}
                        onForever={() => setForeverRecord(r)}
                        selecting={selecting}
                        selected={selectedIds.has(r.id)}
                        onToggleSelect={() => toggleSelected(r.id)}
                        onAvatarPress={() => avatarPress(r.id)}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Batch action bar */}
        {selecting && (
          <View style={[styles.batchBar, { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder }]}>
            <Text style={[styles.batchCount, { color: tokens.textPrimary }]}>
              {selectedIds.size} selected
            </Text>
            <Pressable
              onPress={handleBatchRestore}
              disabled={selectedIds.size === 0}
              style={({ pressed }) => [
                styles.restoreBtn,
                pressed && { opacity: 0.8 },
                selectedIds.size === 0 && { opacity: 0.35 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Restore selected"
            >
              <ArchiveRestore size={13} color="#6ee7b7" strokeWidth={2} />
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic('light')
                setConfirmBatchForever(true)
              }}
              disabled={selectedIds.size === 0}
              style={({ pressed }) => [
                styles.batchForeverBtn,
                pressed && { opacity: 0.8 },
                selectedIds.size === 0 && { opacity: 0.35 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete selected forever"
            >
              <Trash2 size={13} color="#fca5a5" strokeWidth={2} />
              <Text style={styles.batchForeverText}>Delete Forever</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Confirmations */}
      <ConfirmDialog
        visible={confirmEmpty}
        title="Empty the trash?"
        message={`This permanently deletes ${records.length} record${records.length !== 1 ? 's' : ''}${folders.length > 0 ? ` and ${folders.length} folder${folders.length !== 1 ? 's' : ''}` : ''}. This cannot be undone.`}
        confirmLabel="Empty Trash"
        destructive
        onConfirm={async () => {
          setConfirmEmpty(false)
          await emptyTrash()
          haptic('warning')
          showToast('Trash emptied')
          refresh()
        }}
        onCancel={() => setConfirmEmpty(false)}
      />

      <ConfirmDialog
        visible={!!foreverRecord}
        title="Delete forever?"
        message={`"${foreverRecord ? stripStoredTimestampPrefix(foreverRecord.name) : ''}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Forever"
        destructive
        onConfirm={async () => {
          if (!foreverRecord) return
          setForeverRecord(null)
          await permanentlyDeleteRecord(foreverRecord.id)
          haptic('warning')
          showToast('Deleted forever')
          refresh()
        }}
        onCancel={() => setForeverRecord(null)}
      />

      <ConfirmDialog
        visible={confirmBatchForever}
        title={`Delete ${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''} forever?`}
        message="They will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Forever"
        destructive
        onConfirm={handleBatchForever}
        onCancel={() => setConfirmBatchForever(false)}
      />

      <ConfirmDialog
        visible={!!foreverFolder}
        title="Delete folder forever?"
        message={`"${foreverFolder?.name ?? ''}" and its trashed records will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Forever"
        destructive
        onConfirm={async () => {
          if (!foreverFolder) return
          setForeverFolder(null)
          await permanentlyDeleteFolder(foreverFolder.id)
          haptic('warning')
          showToast('Deleted forever')
          refresh()
        }}
        onCancel={() => setForeverFolder(null)}
      />
    </View>
  )
}

function TrashRow({
  icon,
  iconBg,
  name,
  meta,
  onRestore,
  onForever,
  selecting = false,
  selected = false,
  onToggleSelect,
  onAvatarPress,
}: {
  icon: React.ReactNode
  iconBg: string
  name: string
  meta: string
  onRestore: () => void
  onForever: () => void
  selecting?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onAvatarPress?: () => void
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={selecting ? onToggleSelect : undefined}
      disabled={!selecting}
      style={[
        styles.row,
        selected
          ? { backgroundColor: tokens.accentTint, borderColor: tokens.accentBorder }
          : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
      ]}
    >
      {onAvatarPress ? (
        <FlipAvatar
          selected={selected}
          onPress={onAvatarPress}
          accessibilityLabel={selecting ? 'Toggle selection' : `Select ${name}`}
        >
          <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
        </FlipAvatar>
      ) : (
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: tokens.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.rowMeta, { color: tokens.textMuted }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {!selecting && (
        <>
          <Pressable
            onPress={onRestore}
            hitSlop={6}
            style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`Restore ${name}`}
          >
            <ArchiveRestore size={13} color="#6ee7b7" strokeWidth={2} />
            <Text style={styles.restoreText}>Restore</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic('light')
              onForever()
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.foreverBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${name} forever`}
          >
            <Trash2 size={13} color="#fca5a5" strokeWidth={2} />
          </Pressable>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyTrashLink: {
    fontSize: 12,
    color: '#fca5a5',
  },
  headerLink: {
    fontSize: 12,
    marginRight: spacing.sm,
  },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  batchCount: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  batchForeverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  batchForeverText: {
    fontSize: 11,
    color: '#fca5a5',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyMessage: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  groupLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  restoreText: {
    fontSize: 11,
    color: '#6ee7b7',
  },
  foreverBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
})
