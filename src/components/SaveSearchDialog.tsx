import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// "Save this search" — name the current query so it can be re-run with one
// tap from the search dropdown (PWA port).

type Props = {
  visible: boolean
  contextLine: string
  onClose: () => void
  onSave: (name: string) => void
}

export function SaveSearchDialog({ visible, contextLine, onClose, onSave }: Props) {
  const { tokens } = useTheme()
  const [name, setName] = useState('')

  useEffect(() => {
    if (visible) setName('')
  }, [visible])

  const canSave = name.trim().length > 0

  return (
    <GlassDialog
      visible={visible}
      onRequestClose={onClose}
      title="Save this search"
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => canSave && onSave(name)}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: tokens.primaryBtnBg,
                opacity: !canSave ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Check size={16} color={tokens.primaryBtnText} strokeWidth={2.5} />
            <Text style={[styles.primaryBtnText, { color: tokens.primaryBtnText }]}>Save</Text>
          </Pressable>
        </>
      }
    >
      <Text style={[styles.context, { color: tokens.textMuted }]}>{contextLine}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. App ideas about butterflies"
        placeholderTextColor={tokens.textFaint}
        style={[
          styles.input,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.borderStrong,
            color: tokens.textPrimary,
          },
        ]}
        autoFocus
        onSubmitEditing={() => canSave && onSave(name)}
      />
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  context: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  ghostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  ghostBtnText: {
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
