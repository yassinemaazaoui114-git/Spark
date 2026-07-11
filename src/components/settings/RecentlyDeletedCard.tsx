import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronRight, Trash2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { getTrashCount } from '@/storage/trash'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Recently Deleted entry card (Archive-card style).

export function RecentlyDeletedCard() {
  const { tokens } = useTheme()
  const router = useRouter()
  const [count, setCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      getTrashCount().then(setCount)
    }, [])
  )

  return (
    <Pressable
      onPress={() => {
        haptic('light')
        router.push('/trash')
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
          borderColor: tokens.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open recently deleted"
    >
      <View style={styles.iconChip}>
        <Trash2 size={18} color="#fca5a5" strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>Recently Deleted</Text>
        <Text style={[styles.meta, { color: tokens.textMuted }]}>
          {count} item{count !== 1 ? 's' : ''} · auto-purged after 30 days
        </Text>
      </View>
      <ChevronRight size={16} color={tokens.textFaint} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
})
