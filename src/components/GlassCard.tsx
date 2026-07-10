import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Frosted-glass card — the PWA's `bg-white/10 border border-white/20 rounded-3xl`.
// Plain translucency (no BlurView) on list surfaces for performance; dialogs
// and the tab bar add real blur separately.

type Props = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** 'subtle' = chips/rows (white/5), 'default' = cards (white/10) */
  variant?: 'default' | 'subtle'
}

export function GlassCard({ children, style, variant = 'default' }: Props) {
  const { theme, tokens } = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: variant === 'subtle' ? tokens.surfaceSubtle : tokens.surface,
          borderColor: variant === 'subtle' ? tokens.border : tokens.borderStrong,
        },
        // Light mode: solid white cards get a soft purple shadow instead of translucency
        theme === 'light' && styles.lightShadow,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  lightShadow: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
})
