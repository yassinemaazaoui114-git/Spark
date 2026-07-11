import { ArrowDownUp, Check } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { SORT_OPTIONS, type SortOption } from '@/lib/sort-records'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Sort dropdown (PWA SortMenu): pill button showing the current order,
// opening a compact glass menu with the 6 options.

type Props = {
  value: SortOption
  onChange: (option: SortOption) => void
}

export function SortMenu({ value, onChange }: Props) {
  const { tokens } = useTheme()
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find((o) => o.id === value)

  return (
    <>
      <Pressable
        onPress={() => {
          haptic('light')
          setOpen(true)
        }}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
            borderColor: tokens.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Sort: ${current?.label ?? 'Sort'}`}
      >
        <ArrowDownUp size={11} color={tokens.textMuted} strokeWidth={2} />
        <Text style={[styles.pillText, { color: tokens.textMuted }]} numberOfLines={1}>
          {current?.label ?? 'Sort'}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.menu,
              { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder },
            ]}
          >
            {SORT_OPTIONS.map((opt) => {
              const selected = opt.id === value
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    haptic('light')
                    onChange(opt.id)
                    setOpen(false)
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    selected && { backgroundColor: tokens.accentTint },
                    pressed && !selected && { backgroundColor: tokens.surfaceSubtle },
                  ]}
                  accessibilityRole="menuitem"
                >
                  <Text
                    style={[
                      styles.itemText,
                      { color: selected ? tokens.accentTextStrong : tokens.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected && <Check size={14} color={tokens.accentTextStrong} strokeWidth={2} />}
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: 150,
  },
  pillText: {
    fontSize: 11,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  menu: {
    width: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 13,
  },
})
