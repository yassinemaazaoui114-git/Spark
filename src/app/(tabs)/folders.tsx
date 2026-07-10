import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { GlassCard } from '@/components/GlassCard'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { onTabReset } from '@/lib/tab-events'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'

export default function FoldersScreen() {
  const { tokens } = useTheme()
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => onTabReset('folders', () => setResetKey((k) => k + 1)), [])

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey} style={styles.content}>
          <GlassCard>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Folders</Text>
            <Text style={[styles.hint, { color: tokens.textMuted }]}>
              Folder list arrives in Step 14.
            </Text>
          </GlassCard>
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
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
  },
})
