import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EditFolderDialog } from '@/components/EditFolderDialog'
import { NewFolderDialog } from '@/components/NewFolderDialog'
import { RecordCard } from '@/components/RecordCard'
import { folderIcon } from '@/constants/icons'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { deleteFolder } from '@/storage/folders'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

// Folder detail view (PWA port): breadcrumb, color-tinted header with
// edit/delete, sub-folders section with "Add sub-folder", records list.

type Props = {
  folderId: string
  folders: Folder[]
  records: VoiceRecord[]
  /** Navigate: a folder id opens that folder, null returns to the list */
  onNavigate: (folderId: string | null) => void
  onChanged: () => void
}

export function FolderDetail({ folderId, folders, records, onNavigate, onChanged }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [editTarget, setEditTarget] = useState<Folder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showNewSubFolder, setShowNewSubFolder] = useState(false)

  const folder = folders.find((f) => f.id === folderId)
  if (!folder) return null

  const parent = folder.parentId ? folders.find((f) => f.id === folder.parentId) : null
  const folderRecords = records.filter((r) => r.folderId === folder.id && !r.archived)
  const subFolders = folders
    .filter((f) => f.parentId === folder.id)
    .sort((a, b) => a.order - b.order)
  const Icon = folderIcon(folder.icon)

  const handleDelete = async () => {
    setConfirmDelete(false)
    try {
      await deleteFolder(folder.id)
      haptic('warning')
      showToast('Folder deleted')
      onChanged()
      onNavigate(folder.parentId ?? null)
    } catch {
      haptic('error')
      showToast('Could not delete folder')
    }
  }

  return (
    <View>
      {/* Breadcrumb: Home › [parent ›] name */}
      <View style={styles.breadcrumb}>
        <Pressable onPress={() => onNavigate(null)} hitSlop={6}>
          <Text style={[styles.crumbLink, { color: tokens.textSecondary }]}>Home</Text>
        </Pressable>
        {parent && (
          <>
            <ChevronRight size={13} color={tokens.textFaint} strokeWidth={2} />
            <Pressable onPress={() => onNavigate(parent.id)} hitSlop={6}>
              <Text style={[styles.crumbLink, { color: tokens.textSecondary }]}>
                {parent.name}
              </Text>
            </Pressable>
          </>
        )}
        <ChevronRight size={13} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.crumbCurrent, { color: tokens.textPrimary }]} numberOfLines={1}>
          {folder.name}
        </Text>
      </View>

      {/* Color-tinted folder card */}
      <View
        style={[
          styles.card,
          { backgroundColor: `${folder.color}10`, borderColor: tokens.borderStrong },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconChip, { backgroundColor: `${folder.color}40` }]}>
            <Icon size={20} color={folder.color} strokeWidth={2} />
          </View>
          <View style={styles.headerBody}>
            <Text style={[styles.folderName, { color: tokens.textPrimary }]} numberOfLines={1}>
              {folder.name}
            </Text>
            <Text style={[styles.folderMeta, { color: tokens.textMuted }]}>
              {folderRecords.length} record{folderRecords.length !== 1 ? 's' : ''}
              {subFolders.length > 0 &&
                ` · ${subFolders.length} sub-folder${subFolders.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptic('light')
              setEditTarget(folder)
            }}
            hitSlop={6}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Edit folder"
          >
            <Pencil size={16} color={tokens.textMuted} strokeWidth={2} />
          </Pressable>
          {!folder.isDefault && (
            <Pressable
              onPress={() => {
                haptic('light')
                setConfirmDelete(true)
              }}
              hitSlop={6}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete folder"
            >
              <Trash2 size={16} color={tokens.textMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Sub-folders */}
        <View style={styles.subFolderSection}>
          {subFolders.length > 0 && (
            <>
              <Text style={[styles.subFolderLabel, { color: tokens.textMuted }]}>
                SUB-FOLDERS
              </Text>
              <View style={styles.subFolderList}>
                {subFolders.map((sf) => {
                  const SfIcon = folderIcon(sf.icon)
                  const sfCount = records.filter(
                    (r) => r.folderId === sf.id && !r.archived
                  ).length
                  return (
                    <Pressable
                      key={sf.id}
                      onPress={() => {
                        haptic('light')
                        onNavigate(sf.id)
                      }}
                      style={({ pressed }) => [
                        styles.subFolderRow,
                        {
                          backgroundColor: `${sf.color}${pressed ? '20' : '12'}`,
                          borderColor: `${sf.color}25`,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open sub-folder ${sf.name}`}
                    >
                      <View style={[styles.subFolderIcon, { backgroundColor: `${sf.color}40` }]}>
                        <SfIcon size={14} color={sf.color} strokeWidth={2} />
                      </View>
                      <Text
                        style={[styles.subFolderName, { color: tokens.textPrimary }]}
                        numberOfLines={1}
                      >
                        {sf.name}
                      </Text>
                      <View style={[styles.subFolderCount, { backgroundColor: tokens.surface }]}>
                        <Text style={[styles.subFolderCountText, { color: tokens.textMuted }]}>
                          {sfCount}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={tokens.textFaint} strokeWidth={2} />
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}
          <Pressable
            onPress={() => {
              haptic('light')
              setShowNewSubFolder(true)
            }}
            style={({ pressed }) => [
              styles.addSubFolderRow,
              { borderColor: tokens.borderStrong },
              pressed && { backgroundColor: tokens.surfaceSubtle },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add sub-folder"
          >
            <Plus size={14} color={tokens.textMuted} strokeWidth={2} />
            <Text style={[styles.addSubFolderText, { color: tokens.textMuted }]} numberOfLines={1}>
              Add sub-folder to &ldquo;{folder.name}&rdquo;
            </Text>
          </Pressable>
        </View>

        {/* Records */}
        {folderRecords.length === 0 ? (
          <View style={styles.empty}>
            {subFolders.length > 0 ? (
              <>
                <Text style={[styles.emptyTitle, { color: tokens.textSecondary }]}>
                  Only sub-folders here
                </Text>
                <Text style={[styles.emptyMessage, { color: tokens.textMuted }]}>
                  This folder has no records of its own — open a sub-folder to see its contents.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.emptyTitle, { color: tokens.textSecondary }]}>
                  No records yet
                </Text>
                <Text style={[styles.emptyMessage, { color: tokens.textMuted }]}>
                  Tap the mic on the home screen to capture your first thought into this folder.
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.recordList}>
            {folderRecords.map((r) => (
              <RecordCard key={r.id} record={r} onChanged={onChanged} />
            ))}
          </View>
        )}
      </View>

      <NewFolderDialog
        visible={showNewSubFolder}
        defaultParentId={folder.id}
        onClose={() => setShowNewSubFolder(false)}
        onCreated={() => {
          setShowNewSubFolder(false)
          onChanged()
        }}
      />

      <EditFolderDialog
        folder={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          onChanged()
        }}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete folder "${folder.name}"?`}
        message={`Records move to Inbox. Sub-folders move to ${folder.parentId ? 'the parent folder' : 'the top level'}. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  crumbLink: {
    fontSize: 13,
  },
  crumbCurrent: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
  },
  folderName: {
    fontSize: 17,
    fontWeight: '600',
  },
  folderMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  headerBtn: {
    padding: 4,
  },
  subFolderSection: {
    marginBottom: spacing.lg,
  },
  subFolderLabel: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  subFolderList: {
    gap: 6,
  },
  subFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  subFolderIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subFolderName: {
    flex: 1,
    fontSize: 13,
  },
  subFolderCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  subFolderCountText: {
    fontSize: 11,
  },
  addSubFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSubFolderText: {
    fontSize: 12,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyMessage: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  recordList: {
    gap: spacing.sm,
  },
})
