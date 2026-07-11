import { GripVertical } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist'

import { GlassCard } from '@/components/GlassCard'
import { folderIcon } from '@/constants/icons'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Drag-to-reorder mode for top-level folders (PWA reorder mode port):
// grip handles, Save order / Cancel header, "Open" shortcut per row.

type Props = {
  folders: Folder[] // top-level, already sorted
  countByFolder: (folderId: string) => number
  subCountByFolder: (folderId: string) => number
  onSave: (orderedIds: string[]) => void
  onCancel: () => void
  onOpen: (folderId: string) => void
}

export function FolderReorderList({
  folders,
  countByFolder,
  subCountByFolder,
  onSave,
  onCancel,
  onOpen,
}: Props) {
  const { tokens } = useTheme()
  const [list, setList] = useState<Folder[]>(folders)

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Folder>) => {
    const Icon = folderIcon(item.icon)
    const count = countByFolder(item.id)
    const subCount = subCountByFolder(item.id)
    return (
      <ScaleDecorator activeScale={1.03}>
        <View
          style={[
            styles.row,
            { backgroundColor: `${item.color}12`, borderColor: `${item.color}25` },
            isActive && styles.rowActive,
          ]}
        >
          {/* Grip — press and hold to drag */}
          <Pressable
            onPressIn={() => {
              haptic('light')
              drag()
            }}
            hitSlop={8}
            style={styles.grip}
            accessibilityRole="button"
            accessibilityLabel={`Drag to reorder ${item.name}`}
          >
            <GripVertical size={16} color={tokens.textFaint} strokeWidth={2} />
          </Pressable>

          <View style={[styles.iconChip, { backgroundColor: `${item.color}40` }]}>
            <Icon size={16} color={item.color} strokeWidth={2} />
          </View>

          <View style={styles.body}>
            <Text style={[styles.name, { color: tokens.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {subCount > 0 && (
              <Text style={[styles.subCount, { color: tokens.textFaint }]}>
                {subCount} sub-folder{subCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <View style={[styles.countPill, { backgroundColor: tokens.surface }]}>
            <Text style={[styles.countText, { color: tokens.textMuted }]}>{count}</Text>
          </View>

          <Pressable
            onPress={() => onOpen(item.id)}
            style={({ pressed }) => [
              styles.openBtn,
              { backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Open folder ${item.name}`}
          >
            <Text style={[styles.openText, { color: tokens.accentIcon }]}>Open</Text>
          </Pressable>
        </View>
      </ScaleDecorator>
    )
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>Folders</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onCancel} hitSlop={6} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: tokens.textMuted }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => onSave(list.map((f) => f.id))}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: tokens.primaryBtnBg },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.saveText, { color: tokens.primaryBtnText }]}>Save order</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.hint, { color: tokens.textMuted }]}>
        Drag the handles to reorder. Tap Save when done.
      </Text>

      <DraggableFlatList
        data={list}
        keyExtractor={(f) => f.id}
        onDragEnd={({ data }) => {
          haptic('light')
          setList(data)
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        scrollEnabled
      />
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 12,
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowActive: {
    borderColor: 'rgba(167,139,250,0.8)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  grip: {
    padding: 4,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  subCount: {
    fontSize: 10,
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
  },
  openBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  openText: {
    fontSize: 12,
  },
})
