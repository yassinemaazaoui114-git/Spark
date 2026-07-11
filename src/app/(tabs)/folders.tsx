import { useFocusEffect } from 'expo-router'
import { ArrowDownUp, Plus } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { FilterChips } from '@/components/FilterChips'
import { FilteredResults } from '@/components/FilteredResults'
import { FolderDetail } from '@/components/FolderDetail'
import { FolderReorderList } from '@/components/FolderReorderList'
import { GlassCard } from '@/components/GlassCard'
import { NewFolderDialog } from '@/components/NewFolderDialog'
import { SearchBar } from '@/components/SearchBar'
import { SearchResults } from '@/components/SearchResults'
import { SelectionToolbar } from '@/components/SelectionToolbar'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { folderIcon } from '@/constants/icons'
import { useToast } from '@/context/ToastContext'
import { useRecordFilters } from '@/hooks/useRecordFilters'
import { useSearch } from '@/hooks/useSearch'
import { setActiveFolderId as syncActiveFolder } from '@/lib/active-folder'
import { haptic } from '@/lib/haptics'
import { selection } from '@/lib/selection'
import { onTabReset } from '@/lib/tab-events'
import { getFolders, saveFolderOrder } from '@/storage/folders'
import { getRecords } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

export default function FoldersScreen() {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [folders, setFolders] = useState<Folder[]>([])
  const [records, setRecords] = useState<VoiceRecord[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)

  // Currently open folder (null = list). Mirrored into the module store so
  // the Record tab's save dialogs default new notes into this folder.
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const openFolder = useCallback((id: string | null) => {
    setActiveFolderId(id)
    syncActiveFolder(id)
  }, [])

  // Search + quick filters — scoped to the open folder when inside one
  const search = useSearch(records, activeFolderId)
  const [allTags, setAllTags] = useState<string[]>([])
  const filters = useRecordFilters(records, activeFolderId)

  // Re-tap on the Folders tab → back to the folder list (PWA behavior)
  const [resetKey, setResetKey] = useState(0)
  useEffect(
    () =>
      onTabReset('folders', () => {
        setActiveFolderId(null)
        syncActiveFolder(null)
        setReorderMode(false)
        search.reset()
        filters.reset()
        selection.exit()
        setResetKey((k) => k + 1)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const refresh = useCallback(async () => {
    setFolders(await getFolders())
    setRecords(await getRecords())
    setAllTags(await getAllTags())
  }, [])

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false)
  const onPullRefresh = useCallback(async () => {
    setRefreshing(true)
    haptic('medium')
    await refresh()
    await new Promise((r) => setTimeout(r, 400))
    setRefreshing(false)
    haptic('light')
  }, [refresh])

  // Reload whenever the tab gains focus — records/folders may have changed
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const countByFolder = (folderId: string) =>
    records.filter((r) => r.folderId === folderId && !r.archived).length
  const subCountByFolder = (folderId: string) =>
    folders.filter((f) => f.parentId === folderId).length

  const topLevel = folders.filter((f) => !f.parentId).sort((a, b) => a.order - b.order)

  const handleSaveOrder = async (orderedIds: string[]) => {
    await saveFolderOrder(orderedIds)
    await refresh()
    haptic('success')
    showToast('Folder order saved')
    setReorderMode(false)
  }

  // Reorder mode replaces the ScrollView — DraggableFlatList is its own list
  if (reorderMode) {
    return (
      <View style={styles.root}>
        <ButterflyBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.reorderContent}>
            <FolderReorderList
              folders={topLevel}
              countByFolder={countByFolder}
              subCountByFolder={subCountByFolder}
              onSave={handleSaveOrder}
              onCancel={() => setReorderMode(false)}
              onOpen={(id) => {
                setReorderMode(false)
                openFolder(id)
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    )
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
            <SearchBar search={search} folders={folders} onLoadSavedFolder={openFolder} />
            {/* Inner cross-fade between views (search / filters / folder / list) */}
            <FadeView
              key={
                search.active
                  ? 'search'
                  : filters.active
                    ? 'filters'
                    : (activeFolderId ?? 'list')
              }
              style={styles.fadeContent}
            >
            {search.active ? (
              <SearchResults search={search} folders={folders} onChanged={refresh} />
            ) : filters.active ? (
              <>
                <FilterChips filters={filters} allTags={allTags} />
                <FilteredResults filters={filters} folders={folders} onChanged={refresh} />
              </>
            ) : activeFolderId ? (
              <>
                <FilterChips filters={filters} allTags={allTags} />
                <FolderDetail
                  folderId={activeFolderId}
                  folders={folders}
                  records={records}
                  onNavigate={openFolder}
                  onChanged={refresh}
                />
              </>
            ) : (
            <GlassCard>
              <View style={styles.listHeader}>
                <Text style={[styles.title, { color: tokens.textPrimary }]}>Folders</Text>
                {topLevel.length > 1 && (
                  <Pressable
                    onPress={() => {
                      haptic('light')
                      setReorderMode(true)
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.reorderBtn,
                      { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surfaceSubtle },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Reorder folders"
                  >
                    <ArrowDownUp size={14} color={tokens.textMuted} strokeWidth={2} />
                    <Text style={[styles.reorderText, { color: tokens.textMuted }]}>Reorder</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.list}>
                {topLevel.map((f) => {
                  const Icon = folderIcon(f.icon)
                  const count = countByFolder(f.id)
                  const subCount = folders.filter((sf) => sf.parentId === f.id).length
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => {
                        haptic('light')
                        openFolder(f.id)
                      }}
                      style={({ pressed }) => [
                        styles.folderRow,
                        {
                          backgroundColor: `${f.color}${pressed ? '20' : '12'}`,
                          borderColor: `${f.color}25`,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open folder ${f.name}`}
                    >
                      <View style={[styles.iconChip, { backgroundColor: `${f.color}40` }]}>
                        <Icon size={16} color={f.color} strokeWidth={2} />
                      </View>
                      <View style={styles.folderBody}>
                        <Text
                          style={[styles.folderName, { color: tokens.textPrimary }]}
                          numberOfLines={1}
                        >
                          {f.name}
                        </Text>
                        {subCount > 0 && (
                          <Text style={[styles.subCount, { color: tokens.textFaint }]}>
                            {subCount} sub-folder{subCount !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.countPill, { backgroundColor: tokens.surface }]}>
                        <Text style={[styles.countText, { color: tokens.textMuted }]}>{count}</Text>
                      </View>
                    </Pressable>
                  )
                })}

                {/* Dashed "New folder" row */}
                <Pressable
                  onPress={() => {
                    haptic('light')
                    setShowNewFolder(true)
                  }}
                  style={({ pressed }) => [
                    styles.newFolderRow,
                    { borderColor: tokens.borderStrong },
                    pressed && { backgroundColor: tokens.surfaceSubtle },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="New folder"
                >
                  <View style={[styles.iconChip, { backgroundColor: tokens.surfaceSubtle }]}>
                    <Plus size={16} color={tokens.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.newFolderText, { color: tokens.textSecondary }]}>
                    New folder
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
            )}
            </FadeView>
          </ScrollView>
        </FadeView>
      </SafeAreaView>

      <NewFolderDialog
        visible={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onCreated={() => {
          setShowNewFolder(false)
          refresh()
        }}
      />

      <SelectionToolbar onChanged={refresh} />
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
  reorderContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: TAB_BAR_SPACE,
  },
  fadeContent: {
    flex: 0,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  reorderText: {
    fontSize: 11,
  },
  list: {
    gap: spacing.sm,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBody: {
    flex: 1,
    minWidth: 0,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subCount: {
    fontSize: 10,
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
  },
  newFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  newFolderText: {
    fontSize: 13,
  },
})
