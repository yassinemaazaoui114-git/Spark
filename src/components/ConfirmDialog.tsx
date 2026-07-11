import { Pressable, StyleSheet, Text } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Generic confirmation dialog — replaces the PWA's browser confirm() with
// an in-theme modal. Destructive confirms get the red button.

type Props = {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { tokens } = useTheme()

  return (
    <GlassDialog
      visible={visible}
      onRequestClose={onCancel}
      title={title}
      footer={
        <>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.ghostBtn,
              pressed && { backgroundColor: tokens.surfaceSubtle },
            ]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: destructive ? '#dc2626' : tokens.primaryBtnBg },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[styles.confirmText, { color: destructive ? '#ffffff' : tokens.primaryBtnText }]}
            >
              {confirmLabel}
            </Text>
          </Pressable>
        </>
      }
    >
      <Text style={[styles.message, { color: tokens.textMuted }]}>{message}</Text>
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  ghostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  ghostBtnText: {
    fontSize: 14,
  },
  confirmBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
