import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { DebugStorage } from '@/components/DebugStorage'
import { FadeView } from '@/components/FadeView'
import { GlassCard } from '@/components/GlassCard'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { onTabReset } from '@/lib/tab-events'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'

export default function RecordScreen() {
  const { tokens } = useTheme()
  // Re-tapping the active Record tab resets to default state.
  // For now that just replays the fade; filters/search reset here later.
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => onTabReset('index', () => setResetKey((k) => k + 1)), [])

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Spark</Text>
              <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
                Capture every thought
              </Text>
            </View>

            <GlassCard>
              <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
                What&apos;s the idea?
              </Text>
              <Text style={[styles.cardHint, { color: tokens.textMuted }]}>
                Tap, talk, done. New notes land in inbox.
              </Text>
            </GlassCard>

            {/* TEMPORARY Step 4 test harness — removed in Step 6 */}
            <DebugStorage />
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
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
  },
})
