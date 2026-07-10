import { Search, X } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Search bar with clear button + recent-searches dropdown shown while the
// empty input is focused (PWA port). Date mode joins in Step 21.

type Props = {
  query: string
  onChangeQuery: (q: string) => void
  onSubmit: (q: string) => void
  recents: string[]
  onClearRecents: () => void
}

export function SearchBar({ query, onChangeQuery, onSubmit, recents, onClearRecents }: Props) {
  const { tokens } = useTheme()
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showRecents = focused && !query && recents.length > 0

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
        ]}
      >
        <Search size={16} color={tokens.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          onBlur={() => {
            // Delay so recent-chip taps land before the dropdown hides (PWA: 200ms)
            blurTimer.current = setTimeout(() => setFocused(false), 200)
          }}
          onSubmitEditing={() => onSubmit(query)}
          placeholder="Search by name..."
          placeholderTextColor={tokens.textFaint}
          style={[styles.input, { color: tokens.textPrimary }]}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => onChangeQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={16} color={tokens.textMuted} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {showRecents && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder },
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownLabel, { color: tokens.textFaint }]}>RECENT</Text>
            <Pressable onPress={onClearRecents} hitSlop={6}>
              <Text style={[styles.clearLink, { color: tokens.textFaint }]}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {recents.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  haptic('light')
                  onChangeQuery(s)
                  onSubmit(s)
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: tokens.textSecondary }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 11,
  },
  dropdown: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dropdownLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  clearLink: {
    fontSize: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
})
