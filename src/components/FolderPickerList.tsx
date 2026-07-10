import { Check, Folder as FolderIcon } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { folderIcon } from '@/constants/icons'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Folder list with selection — used by the save dialogs ("Save to folder")
// and the new-folder dialog's parent picker (which adds a "top level" row
// via noneLabel; selecting it reports null).

type Props = {
  folders: Folder[]
  selectedId: string | null
  onSelect: (folderId: string | null) => void
  /** When set, renders a "no folder" row at the top (selected when selectedId is null) */
  noneLabel?: string
}

export function FolderPickerList({ folders, selectedId, onSelect, noneLabel }: Props) {
  const { tokens } = useTheme()
  const sorted = [...folders].sort((a, b) => a.order - b.order)

  return (
    <View style={styles.list}>
      {noneLabel != null && (
        <Pressable
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor:
                selectedId === null
                  ? tokens.surfaceStrong
                  : pressed
                    ? tokens.surface
                    : tokens.surfaceSubtle,
              borderColor: selectedId === null ? tokens.borderStrong : tokens.border,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedId === null }}
        >
          <View style={[styles.iconChip, { backgroundColor: tokens.surface }]}>
            <FolderIcon size={14} color={tokens.textMuted} strokeWidth={2} />
          </View>
          <Text style={[styles.name, { color: tokens.textPrimary }]}>{noneLabel}</Text>
          {selectedId === null && <Check size={16} color={tokens.textPrimary} strokeWidth={2} />}
        </Pressable>
      )}
      {sorted.map((f) => {
        const Icon = folderIcon(f.icon)
        const selected = selectedId === f.id
        const parentName = f.parentId
          ? folders.find((p) => p.id === f.parentId)?.name
          : null
        return (
          <Pressable
            key={f.id}
            onPress={() => onSelect(f.id)}
            style={({ pressed }) => [
              styles.row,
              f.parentId != null && styles.indented,
              {
                backgroundColor: selected
                  ? tokens.surfaceStrong
                  : pressed
                    ? tokens.surface
                    : tokens.surfaceSubtle,
                borderColor: selected ? tokens.borderStrong : tokens.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: `${f.color}40` },
              ]}
            >
              <Icon size={14} color={f.color} strokeWidth={2} />
            </View>
            <Text
              style={[styles.name, { color: tokens.textPrimary }]}
              numberOfLines={1}
            >
              {f.name}
            </Text>
            {parentName && (
              <Text style={[styles.parentHint, { color: tokens.textFaint }]}>
                in {parentName}
              </Text>
            )}
            {selected && <Check size={16} color={tokens.textPrimary} strokeWidth={2} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  indented: {
    marginLeft: spacing.xl,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 13,
  },
  parentHint: {
    fontSize: 10,
  },
})
