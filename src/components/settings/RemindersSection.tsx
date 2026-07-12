import { useFocusEffect } from 'expo-router'
import { Bell, X } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { cancelReminder, formatReminderTime } from '@/lib/reminders'
import { stripStoredTimestampPrefix } from '@/storage/format'
import { getRecord } from '@/storage/records'
import { getReminders } from '@/storage/reminders'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'
import type { Reminder } from '@/types'

// Settings → Reminders: every pending reminder with its record name and fire
// time; × cancels (notification + row). Expired rows are swept on app open.

type Item = {
  reminder: Reminder
  name: string
}

export function RemindersSection() {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [items, setItems] = useState<Item[]>([])

  const load = useCallback(async () => {
    const reminders = await getReminders()
    const withNames = await Promise.all(
      reminders.map(async (reminder) => {
        const record = await getRecord(reminder.recordId)
        return {
          reminder,
          name: record ? stripStoredTimestampPrefix(record.name) : 'Deleted recording',
        }
      })
    )
    setItems(withNames)
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const handleCancel = async (item: Item) => {
    await cancelReminder(item.reminder)
    haptic('light')
    showToast('Reminder cancelled')
    load()
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Bell size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>REMINDERS</Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}
      >
        {items.length === 0 ? (
          <Text style={[styles.empty, { color: tokens.textFaint }]}>
            No reminders scheduled. Long-press a record → “Remind me”.
          </Text>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View
                key={item.reminder.id}
                style={[styles.row, { borderColor: tokens.border }]}
              >
                <View style={[styles.bellChip, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Bell size={13} color={accent.amber} strokeWidth={2} />
                </View>
                <View style={styles.rowBody}>
                  <Text
                    style={[styles.rowName, { color: tokens.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.rowTime, { color: tokens.textMuted }]}>
                    {formatReminderTime(item.reminder.fireAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleCancel(item)}
                  hitSlop={8}
                  style={styles.cancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel reminder for ${item.name}`}
                >
                  <X size={15} color={tokens.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
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
  empty: {
    fontSize: 12,
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bellChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowTime: {
    fontSize: 11,
    marginTop: 1,
  },
  cancelBtn: {
    padding: 4,
  },
})
