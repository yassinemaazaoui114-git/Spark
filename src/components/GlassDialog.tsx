import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Shared modal shell — the PWA's zinc-900/95 centered dialog with backdrop.
// Content scrolls; footer stays pinned below it.

type Props = {
  visible: boolean
  onRequestClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function GlassDialog({ visible, onRequestClose, title, children, footer }: Props) {
  const { tokens } = useTheme()

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onRequestClose} />
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder },
          ]}
        >
          <Text style={[styles.title, { color: tokens.textPrimary }]}>{title}</Text>
          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  body: {
    flexGrow: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
})
