import { useFocusEffect } from 'expo-router'
import { Clock, FolderPlus } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { FilterChips } from '@/components/FilterChips'
import { FilteredResults } from '@/components/FilteredResults'
import { GlassCard } from '@/components/GlassCard'
import { NewFolderDialog } from '@/components/NewFolderDialog'
import { OnlineIndicator } from '@/components/OnlineIndicator'
import { RecordCard } from '@/components/RecordCard'
import { RecordPanel } from '@/components/RecordPanel'
import { HomeSkeleton } from '@/components/Skeleton'
import { SaveRecordingDialog } from '@/components/SaveRecordingDialog'
import { SearchBar } from '@/components/SearchBar'
import { SearchResults } from '@/components/SearchResults'
import { SelectionToolbar } from '@/components/SelectionToolbar'
import { SmartFolderView } from '@/components/SmartFolderView'
import { TextNoteDialog } from '@/components/TextNoteDialog'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { useToast } from '@/context/ToastContext'
import { useRecordFilters } from '@/hooks/useRecordFilters'
import { useRecorder, type FinishedRecording } from '@/hooks/useRecorder'
import { useSearch } from '@/hooks/useSearch'
import { haptic } from '@/lib/haptics'
import { selection } from '@/lib/selection'
import {
  getSmartFolder,
  onSmartFolderChange,
  setSmartFolder,
  type SmartFolder,
} from '@/lib/smart-folder'
import { onTabReset } from '@/lib/tab-events'
import { ensureSeedFolders, getFolders } from '@/storage/folders'
import { getRecords } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

export default function RecordScreen() {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const recorder = useRecorder()

  // Finished recording awaiting a name — consumed by the save dialog
  const [pending, setPending] = useState<FinishedRecording | null>(null)

  // Dialog visibility
  const [showTextNote, setShowTextNote] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)

  const [records, setRecords] = useState<VoiceRecord[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const refreshRecords = useCallback(async () => {
    setRecords(await getRecords())
    setFolders(await getFolders())
    setAllTags(await getAllTags())
    setLoading(false)
  }, [])

  // Pull-to-refresh
  const onPullRefresh = useCallback(async () => {
    setRefreshing(true)
    haptic('medium')
    await refreshRecords()
    // Brief delay so the spinner is visible (PWA behavior)
    await new Promise((r) => setTimeout(r, 400))
    setRefreshing(false)
    haptic('light')
  }, [refreshRecords])

  // Global search + quick filters (home is never folder-scoped)
  const search = useSearch(records, null)
  const filters = useRecordFilters(records, null)

  // Smart folder view (set from Settings, rendered here)
  const [smart, setSmart] = useState<SmartFolder | null>(getSmartFolder())
  useEffect(() => onSmartFolderChange(setSmart), [])
  const clearSmart = () => setSmartFolder(null)

  // Re-tapping the active Record tab resets to default state
  const [resetKey, setResetKey] = useState(0)
  useEffect(
    () =>
      onTabReset('index', () => {
        search.reset()
        filters.reset()
        setSmartFolder(null)
        selection.exit()
        setResetKey((k) => k + 1)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    ensureSeedFolders().catch(() => {})
  }, [])

  // Reload whenever the tab gains focus — records may have changed from the
  // Folders tab, Settings, or the trash screen (e.g. a restore).
  useFocusEffect(
    useCallback(() => {
      refreshRecords()
    }, [refreshRecords])
  )

  const handleReRecord = () => {
    setPending(null)
    // Brief delay so the dialog closes before the recorder starts (PWA does 50ms)
    setTimeout(async () => {
      const ok = await recorder.start()
      if (!ok) {
        haptic('error')
        showToast('Microphone permission denied')
      }
    }, 100)
  }

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onPullRefresh}
                tintColor="#c4b5fd"
                colors={['#8b5cf6']}
                progressBackgroundColor="#1a0b2e"
              />
            }
          >
            {loading ? (
              <HomeSkeleton />
            ) : (
            <>
            <OnlineIndicator />
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: tokens.textPrimary }]}>Spark</Text>
                <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
                  Capture every thought
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  haptic('light')
                  setShowNewFolder(true)
                }}
                style={({ pressed }) => [
                  styles.headerButton,
                  { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface },
                ]}
                accessibilityRole="button"
                accessibilityLabel="New folder"
              >
                <FolderPlus size={20} color={tokens.textPrimary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Search bar — visible on the home tab like the PWA */}
            <SearchBar search={search} folders={folders} />

            {/* Inner cross-fade between the content views */}
            <FadeView
              key={
                search.active
                  ? 'search'
                  : smart
                    ? `smart-${smart}`
                    : filters.active
                      ? 'filters'
                      : 'normal'
              }
              style={styles.fadeContent}
            >
            {search.active ? (
              <SearchResults search={search} folders={folders} onChanged={refreshRecords} />
            ) : smart ? (
              <SmartFolderView
                smart={smart}
                records={records}
                folders={folders}
                onClear={clearSmart}
                onChanged={refreshRecords}
              />
            ) : (
              <>
                {/* Quick filter chips — Pinned / Long / Short / tags */}
                {records.some((r) => !r.archived) && (
                  <FilterChips filters={filters} allTags={allTags} />
                )}

                {filters.active ? (
                  <FilteredResults
                    filters={filters}
                    folders={folders}
                    onChanged={refreshRecords}
                  />
                ) : (
                  <>
                <RecordPanel
                  recorder={recorder}
                  onFinished={setPending}
                  onTypeNote={() => setShowTextNote(true)}
                />

                {/* Recent — last 3 non-archived records across all folders */}
                {records.filter((r) => !r.archived).length > 0 && (
                  <GlassCard style={{ marginTop: spacing.lg }}>
                    <View style={styles.recentHeader}>
                      <Text style={[styles.recentTitle, { color: tokens.textPrimary }]}>Recent</Text>
                      <Clock size={16} color={tokens.textFaint} strokeWidth={2} />
                    </View>
                    <View style={styles.recentList}>
                      {records
                        .filter((r) => !r.archived)
                        .slice(0, 3)
                        .map((r) => (
                          <RecordCard
                            key={r.id}
                            record={r}
                            folderName={folders.find((f) => f.id === r.folderId)?.name || 'Unknown'}
                            onChanged={refreshRecords}
                          />
                        ))}
                    </View>
                  </GlassCard>
                )}
                  </>
                )}
              </>
            )}
            </FadeView>
            </>
            )}
          </ScrollView>
        </FadeView>
      </SafeAreaView>

      <SaveRecordingDialog
        pending={pending}
        onSaved={() => {
          setPending(null)
          refreshRecords()
        }}
        onDiscarded={() => setPending(null)}
        onReRecord={handleReRecord}
      />

      <TextNoteDialog
        visible={showTextNote}
        onClose={() => setShowTextNote(false)}
        onSaved={() => {
          setShowTextNote(false)
          refreshRecords()
        }}
      />

      <NewFolderDialog
        visible={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onCreated={() => {
          setShowNewFolder(false)
          refreshRecords()
        }}
      />

      <SelectionToolbar onChanged={refreshRecords} />
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
  fadeContent: {
    flex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentList: {
    gap: spacing.sm,
  },
})
