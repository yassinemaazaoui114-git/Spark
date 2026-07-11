import { Hash, Plus, Tag, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Tag editor — chips + input + suggestions from existing tags (PWA behavior:
// enter/comma commits, backspace on empty input removes the last chip).

type Props = {
  tags: string[]
  onChange: (tags: string[]) => void
  allTags: string[]
  label?: string
}

export function TagInput({ tags, onChange, allTags, label = 'Tags (optional)' }: Props) {
  const { tokens } = useTheme()
  const [input, setInput] = useState('')

  const commit = (raw: string) => {
    const t = raw.trim().replace(/,+$/, '')
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const suggestions = allTags.filter((t) => !tags.includes(t)).slice(0, 8)

  return (
    <View>
      <View style={styles.labelRow}>
        <Tag size={12} color={tokens.textMuted} strokeWidth={2} />
        <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      </View>

      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map((t) => (
            <View
              key={t}
              style={[
                styles.chip,
                { backgroundColor: tokens.accentTint, borderColor: tokens.accentBorderSoft },
              ]}
            >
              <Hash size={10} color={tokens.accentIconSoft} strokeWidth={2} />
              <Text style={[styles.chipText, { color: tokens.accentTextStrong }]}>{t}</Text>
              <Pressable onPress={() => removeTag(t)} hitSlop={8} accessibilityLabel={`Remove tag ${t}`}>
                <X size={12} color={tokens.accentTextFaint} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={(text) => {
            // Comma commits the tag, like the PWA
            if (text.endsWith(',')) {
              commit(text)
            } else {
              setInput(text)
            }
          }}
          onSubmitEditing={() => commit(input)}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && !input && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          placeholder="Add a tag..."
          placeholderTextColor={tokens.textFaint}
          style={[
            styles.input,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.borderStrong,
              color: tokens.textPrimary,
            },
          ]}
          blurOnSubmit={false}
          autoCapitalize="none"
        />
        <Pressable
          onPress={() => commit(input)}
          disabled={!input.trim()}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface,
              borderColor: tokens.borderStrong,
              opacity: input.trim() ? 1 : 0.4,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add tag"
        >
          <Plus size={16} color={tokens.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((t) => (
            <Pressable
              key={t}
              onPress={() => commit(t)}
              style={({ pressed }) => [
                styles.suggestion,
                {
                  backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
                  borderColor: tokens.border,
                },
              ]}
            >
              <Hash size={8} color={tokens.textFaint} strokeWidth={2} />
              <Text style={[styles.suggestionText, { color: tokens.textMuted }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  input: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 10,
  },
})
