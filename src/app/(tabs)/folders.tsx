import { useFocusEffect } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ButterflyBackground } from '@/components/ButterflyBackground'
import { FadeView } from '@/components/FadeView'
import { GlassCard } from '@/components/GlassCard'
import { NewFolderDialog } from '@/components/NewFolderDialog'
import { TAB_BAR_SPACE } from '@/components/TabBar'
import { folderIcon } from '@/constants/icons'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { onTabReset } from '@/lib/tab-events'
import { getFolders } from '@/storage/folders'
import { getRecords } from '@/storage/records'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

export default function FoldersScreen() {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [folders, setFolders] = useState<Folder[]>([])
  const [records, setRecords] = useState<VoiceRecord[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)

  const [resetKey, setResetKey] = useState(0)
  useEffect(() => onTabReset('folders', () => setResetKey((k) => k + 1)), [])

  const refresh = useCallback(async () => {
    setFolders(await getFolders())
    setRecords(await getRecords())
  }, [])

  // Reload whenever the tab gains focus — records/folders may have changed
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const countByFolder = (folderId: string) =>
    records.filter((r) => r.folderId === folderId && !r.archived).length

  const topLevel = folders.filter((f) => !f.parentId).sort((a, b) => a.order - b.order)

  return (
    <View style={styles.root}>
      <ButterflyBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FadeView key={resetKey}>
          <ScrollView contentContainerStyle={styles.content}>
            <GlassCard>
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Folders</Text>

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
                        showToast('Folder view arrives in Step 15')
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
