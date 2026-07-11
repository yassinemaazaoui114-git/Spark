import { Check, Sparkles } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { LinearGradient } from 'expo-linear-gradient'

import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { ICON_VARIANTS, radius, spacing } from '@/theme/tokens'

// Settings → Appearance: theme picker (light mode functional in Step 27)
// and app-icon accent variants (functional in Step 29).

export function AppearanceSection() {
  const { theme, tokens } = useTheme()
  const { showToast } = useToast()

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Sparkles size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>APPEARANCE</Text>
      </View>

      {/* Theme picker */}
      <View
        style={[styles.card, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}
      >
        <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>Theme</Text>
        <View style={styles.themeRow}>
          <ThemeOption
            label="Dark"
            sub="Default"
            gradient={['#1a0b2e', '#0f0a1f']}
            selected={theme === 'dark'}
            onPress={() => haptic('light')}
          />
          <ThemeOption
            label="Light"
            sub="Lavender"
            gradient={['#f5f0ff', '#ede4ff']}
            selected={theme === 'light'}
            onPress={() => {
              haptic('light')
              showToast('Light theme arrives in Step 27')
            }}
          />
        </View>
      </View>

      {/* App icon accent variants */}
      <View
        style={[
          styles.card,
          styles.cardSpacing,
          { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>App icon</Text>
        <Text style={[styles.cardHint, { color: tokens.textMuted }]}>
          Pick an accent color for Spark.
        </Text>
        <View style={styles.swatchRow}>
          {ICON_VARIANTS.map((v) => {
            const selected = v.id === 'violet' // accent switching arrives in Step 29
            return (
              <Pressable
                key={v.id}
                onPress={() => {
                  haptic('light')
                  if (!selected) showToast('Icon variants arrive in Step 29')
                }}
                style={[styles.swatchWrap, selected && styles.swatchSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={v.name}
              >
                <LinearGradient
                  colors={[v.swatch, `${v.swatch}99`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swatch}
                >
                  {selected && <Check size={16} color="#ffffff" strokeWidth={2.5} />}
                </LinearGradient>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function ThemeOption({
  label,
  sub,
  gradient,
  selected,
  onPress,
}: {
  label: string
  sub: string
  gradient: [string, string]
  selected: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.themeOption,
        selected
          ? styles.themeSelected
          : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.themePreview, { borderColor: tokens.borderStrong }]}
      />
      <View style={styles.themeText}>
        <Text style={[styles.themeLabel, { color: tokens.textPrimary }]}>{label}</Text>
        <Text style={[styles.themeSub, { color: tokens.textFaint }]}>{sub}</Text>
      </View>
      {selected && <Check size={14} color={tokens.textPrimary} strokeWidth={2} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardSpacing: {
    marginTop: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  cardHint: {
    fontSize: 11,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  themeSelected: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(167,139,250,0.5)',
  },
  themePreview: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  themeText: {
    flex: 1,
    minWidth: 0,
  },
  themeLabel: {
    fontSize: 13,
  },
  themeSub: {
    fontSize: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  swatchWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  swatchSelected: {
    borderColor: 'rgba(255,255,255,0.6)',
  },
  swatch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md - 2,
  },
})
