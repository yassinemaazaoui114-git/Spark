import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FOLDER_ICON_OPTIONS, folderIcon } from '@/constants/icons'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// 26-icon grid picker for folders (PWA FolderIconPicker), 6 per row.

type Props = {
  value: string
  onChange: (iconId: string) => void
}

export function FolderIconPicker({ value, onChange }: Props) {
  const { tokens } = useTheme()
  const selectedLabel = FOLDER_ICON_OPTIONS.find((o) => o.id === value)?.label || 'Folder'

  return (
    <View>
      <Text style={[styles.label, { color: tokens.textMuted }]}>Icon</Text>
      <View style={styles.grid}>
        {FOLDER_ICON_OPTIONS.map((opt) => {
          const Icon = folderIcon(opt.id)
          const selected = value === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                haptic('light')
                onChange(opt.id)
              }}
              style={[
                styles.cell,
                selected
                  ? styles.cellSelected
                  : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label}
            >
              <Icon
                size={16}
                color={selected ? '#ddd6fe' : tokens.textMuted}
                strokeWidth={2}
              />
            </Pressable>
          )
        })}
      </View>
      <Text style={[styles.selectedLabel, { color: tokens.textFaint }]}>{selectedLabel}</Text>
    </View>
  )
}

const CELL = 40

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: 'rgba(139,92,246,0.25)',
    borderColor: 'rgba(167,139,250,0.6)',
  },
  selectedLabel: {
    fontSize: 10,
    marginTop: 6,
  },
})
