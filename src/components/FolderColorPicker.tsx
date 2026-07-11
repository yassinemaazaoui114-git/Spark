import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { FOLDER_COLORS, spacing } from '@/theme/tokens'

// 10 color swatches for folders (PWA FolderColorPicker).

type Props = {
  value: string
  onChange: (color: string) => void
}

export function FolderColorPicker({ value, onChange }: Props) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text style={[styles.label, { color: tokens.textMuted }]}>Color</Text>
      <View style={styles.row}>
        {FOLDER_COLORS.map((c) => {
          const selected = value === c
          return (
            <Pressable
              key={c}
              onPress={() => {
                haptic('light')
                onChange(c)
              }}
              style={[
                styles.swatch,
                { backgroundColor: c },
                selected
                  ? [styles.swatchSelected, { borderColor: tokens.textPrimary }]
                  : { borderColor: tokens.borderStrong },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Color ${c}`}
            >
              {selected && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    transform: [{ scale: 1.1 }],
  },
})
