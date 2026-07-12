import { Check, Sparkles } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { LinearGradient } from 'expo-linear-gradient'

import { useToast } from '@/context/ToastContext'
import { applyLauncherIcon } from '@/lib/app-icon'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { ICON_VARIANTS, radius, spacing } from '@/theme/tokens'

// Settings → Appearance: theme picker and accent variants. The accent pick
// recolors the whole app everywhere; in dev/production builds it ALSO swaps
// the real home-screen icon (Step 36, expo-alternate-app-icons — a no-op in
// Expo Go, where the native module doesn't exist).

export function AppearanceSection() {
  const { theme, tokens, accent, setTheme, setAccent } = useTheme()
  const { showToast } = useToast()

  const pickVariant = async (id: (typeof ICON_VARIANTS)[number]['id'], name: string) => {
    haptic('light')
    setAccent(id)
    const iconChanged = await applyLauncherIcon(id)
    if (iconChanged) showToast(`App icon switched to ${name}`)
  }

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
            onPress={() => {
              haptic('light')
              setTheme('dark')
            }}
          />
          <ThemeOption
            label="Light"
            sub="Lavender"
            gradient={['#f5f0ff', '#ede4ff']}
            selected={theme === 'light'}
            onPress={() => {
              haptic('light')
              setTheme('light')
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
          Pick an accent color for Spark — the app recolors and the home-screen icon
          follows. (Icon switching needs the installed build, not Expo Go.)
        </Text>
        <View style={styles.swatchRow}>
          {ICON_VARIANTS.map((v) => {
            const selected = v.id === accent
            return (
              <Pressable
                key={v.id}
                onPress={() => pickVariant(v.id, v.name)}
                style={[
                  styles.swatchWrap,
                  selected && {
                    borderColor:
                      theme === 'light' ? 'rgba(26,11,46,0.5)' : 'rgba(255,255,255,0.6)',
                  },
                ]}
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
        <Text style={[styles.variantName, { color: tokens.textFaint }]}>
          {ICON_VARIANTS.find((v) => v.id === accent)?.name}
        </Text>
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
          ? { backgroundColor: tokens.accentTintStrong, borderColor: tokens.accentBorderStrong }
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
  swatch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md - 2,
  },
  variantName: {
    fontSize: 10,
    marginTop: spacing.sm,
  },
})
