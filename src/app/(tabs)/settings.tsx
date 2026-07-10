import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { GlassCard } from '@/components/GlassCard'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { SmartViewsSection } from '@/components/settings/SmartViewsSection'
import { TagsSection } from '@/components/settings/TagsSection'
import { onTabReset } from '@/lib/tab-events'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'

export default function SettingsScreen() {
  const { tokens } = useTheme()
  // Re-tap on Settings scrolls to top once this becomes a ScrollView (Step 25).
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => onTabReset('settings', () => setResetKey((k) => k + 1)), [])

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Settings</Text>

            {/* Archive + smart views (Step 23) */}
            <SmartViewsSection />

            {/* Tags management (Step 19) — the full settings page assembles
                around these in Step 25 */}
            <View style={{ marginTop: spacing.lg }}>
              <TagsSection />
            </View>

            <GlassCard style={{ marginTop: spacing.lg }} variant="subtle">
              <Text style={[styles.hint, { color: tokens.textMuted }]}>
                Full settings page arrives in Step 25.
              </Text>
            </GlassCard>
          </ScrollView>
        </FadeView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: TAB_BAR_SPACE,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: 12,
  },
})
