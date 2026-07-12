import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { StatsSheet } from '@/components/StatsSheet'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { AboutSection } from '@/components/settings/AboutSection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { DataSection } from '@/components/settings/DataSection'
import { PrivacyBanner } from '@/components/settings/PrivacyBanner'
import { RecentlyDeletedCard } from '@/components/settings/RecentlyDeletedCard'
import { RemindersSection } from '@/components/settings/RemindersSection'
import { SecuritySection } from '@/components/settings/SecuritySection'
import { SmartViewsSection } from '@/components/settings/SmartViewsSection'
import { StatsCard } from '@/components/settings/StatsCard'
import { TagsSection } from '@/components/settings/TagsSection'
import { computeStats } from '@/lib/stats'
import { onTabReset } from '@/lib/tab-events'
import { getFolders } from '@/storage/folders'
import { getRecords } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

export default function SettingsScreen() {
  const { tokens } = useTheme()

  const [records, setRecords] = useState<VoiceRecord[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showStats, setShowStats] = useState(false)

  // Re-tap on Settings resets (remount scrolls back to top)
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => onTabReset('settings', () => setResetKey((k) => k + 1)), [])

  const refresh = useCallback(async () => {
    setRecords(await getRecords())
    setFolders(await getFolders())
    setTags(await getAllTags())
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const stats = useMemo(() => computeStats(records, folders), [records, folders])

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Settings</Text>

            <PrivacyBanner />

            <View style={styles.section}>
              <StatsCard stats={stats} onPress={() => setShowStats(true)} />
            </View>

            {/* Archive card + smart views grid */}
            <View style={styles.section}>
              <SmartViewsSection />
            </View>

            <View style={styles.section}>
              <RecentlyDeletedCard />
            </View>

            <View style={styles.section}>
              <RemindersSection />
            </View>

            <View style={styles.section}>
              <AppearanceSection />
            </View>

            <View style={styles.section}>
              <SecuritySection />
            </View>

            <View style={styles.section}>
              <TagsSection />
            </View>

            <View style={styles.section}>
              <DataSection
                recordCount={records.length}
                folderCount={folders.length}
                tagCount={tags.length}
                onChanged={refresh}
              />
            </View>

            <View style={styles.section}>
              <AboutSection />
            </View>
          </ScrollView>
        </FadeView>
      </SafeAreaView>

      <StatsSheet visible={showStats} onClose={() => setShowStats(false)} stats={stats} />
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
  section: {
    marginTop: spacing.lg,
  },
})
