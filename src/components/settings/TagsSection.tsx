import { useFocusEffect } from 'expo-router'
import { Hash, Tag, Trash2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { getRecords } from '@/storage/records'
import { deleteTagCompletely, getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Tags: every tag with its record count and a delete button.
// Deleting removes the tag from the central list AND from every record
// (PWA deleteTagCompletely flow, with confirmation).

export function TagsSection() {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [tags, setTags] = useState<string[]>([])
  const [countByTag, setCountByTag] = useState<Record<string, number>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [allTags, records] = await Promise.all([getAllTags(), getRecords()])
    setTags(allTags)
    const counts: Record<string, number> = {}
    for (const t of allTags) {
      counts[t] = records.filter((r) => r.tags.includes(t)).length
    }
    setCountByTag(counts)
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    const tag = deleteTarget
    setDeleteTarget(null)
    await deleteTagCompletely(tag)
    haptic('warning')
    showToast(`Tag "${tag}" deleted`)
    refresh()
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Tag size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>TAGS</Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
      >
        {tags.length === 0 ? (
          <Text style={[styles.emptyText, { color: tokens.textFaint }]}>
            No tags yet. Add tags when saving or renaming a record.
          </Text>
        ) : (
          <>
            <Text style={[styles.hint, { color: tokens.textMuted }]}>
              {tags.length} tag{tags.length !== 1 ? 's' : ''}. Tap delete to remove a tag
              everywhere.
            </Text>
            <View style={styles.list}>
              {tags.map((t) => (
                <View
                  key={t}
                  style={[
                    styles.row,
                    { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
                  ]}
                >
                  <Hash size={14} color="#c4b5fd" strokeWidth={2} />
                  <Text style={[styles.tagName, { color: tokens.textPrimary }]} numberOfLines={1}>
                    {t}
                  </Text>
                  <View style={[styles.countPill, { backgroundColor: tokens.surface }]}>
                    <Text style={[styles.countText, { color: tokens.textFaint }]}>
                      {countByTag[t] ?? 0} record{(countByTag[t] ?? 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      haptic('light')
                      setDeleteTarget(t)
                    }}
                    hitSlop={8}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete tag ${t}`}
                  >
                    <Trash2 size={14} color={tokens.textFaint} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <ConfirmDialog
        visible={!!deleteTarget}
        title={`Delete tag "${deleteTarget ?? ''}"?`}
        message="This removes the tag from the list and from all records that have it. The recordings themselves are not deleted — only the tag."
        confirmLabel="Delete tag"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
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
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  hint: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tagName: {
    flex: 1,
    fontSize: 13,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 10,
  },
  deleteBtn: {
    padding: 4,
  },
})
