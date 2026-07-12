import DateTimePicker from '@react-native-community/datetimepicker'
import { Bell, BellOff, Calendar, Clock } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import {
  cancelReminder,
  formatReminderTime,
  remindersSupported,
  requestNotificationPermission,
  scheduleReminder,
} from '@/lib/reminders'
import { getReminderForRecord } from '@/storage/reminders'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'
import type { Reminder, VoiceRecord } from '@/types'

// "Remind me" dialog (Step 33). One pending reminder per record: scheduling a
// new time replaces the old one. Quick presets + custom date/time pickers
// (same v9 picker API as the date search).

type Props = {
  record: VoiceRecord | null
  onClose: () => void
  onChanged?: () => void
}

// Default suggestion: one hour from now, rounded up to a whole minute
function defaultFireAt(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setSeconds(0, 0)
  return d
}

export function ReminderDialog({ record, onClose, onChanged }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [existing, setExisting] = useState<Reminder | null>(null)
  const [fireAt, setFireAt] = useState<Date>(defaultFireAt())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!record) return
    setFireAt(defaultFireAt())
    setShowDatePicker(false)
    setShowTimePicker(false)
    setSaving(false)
    setExisting(null)
    getReminderForRecord(record.id).then(setExisting)
  }, [record])

  if (!record) return null

  // expo-notifications can't load inside Expo Go (Android, SDK 53+) — the
  // whole flow lights up in the dev build (Step 34).
  const supported = remindersSupported()
  const inFuture = fireAt.getTime() > Date.now() + 5_000
  const canSave = supported && inFuture && !saving

  // Quick presets — evening/morning roll to tomorrow when already past
  const presets: { label: string; compute: () => Date }[] = [
    { label: 'In 1 hour', compute: defaultFireAt },
    {
      label: 'Evening 20:00',
      compute: () => {
        const d = new Date()
        d.setHours(20, 0, 0, 0)
        if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
        return d
      },
    },
    {
      label: 'Tomorrow 09:00',
      compute: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(9, 0, 0, 0)
        return d
      },
    },
  ]

  const dateLabel = fireAt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeLabel = `${pad(fireAt.getHours())}:${pad(fireAt.getMinutes())}`

  const handleCancelExisting = async () => {
    if (!existing) return
    await cancelReminder(existing)
    setExisting(null)
    haptic('light')
    showToast('Reminder cancelled')
    onChanged?.()
  }

  const handleSchedule = async () => {
    if (saving) return
    if (!supported) {
      haptic('warning')
      showToast('Reminders need the dev build (Step 34)')
      return
    }
    if (!inFuture) {
      haptic('warning')
      showToast('Pick a time in the future')
      return
    }
    setSaving(true)
    try {
      const granted = await requestNotificationPermission()
      if (!granted) {
        haptic('error')
        showToast('Notifications are disabled for Spark')
        setSaving(false)
        return
      }
      if (existing) await cancelReminder(existing)
      await scheduleReminder(record, fireAt.getTime())
      haptic('success')
      showToast(`Reminder set — ${formatReminderTime(fireAt.getTime())}`)
      onChanged?.()
      onClose()
    } catch (e) {
      console.error('[reminders] schedule failed:', e)
      haptic('error')
      showToast('Could not schedule the reminder')
      setSaving(false)
    }
  }

  return (
    <GlassDialog
      visible
      onRequestClose={onClose}
      title="Remind me"
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.ghostBtn,
              pressed && { backgroundColor: tokens.surfaceSubtle },
            ]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSchedule}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: tokens.primaryBtnBg,
                opacity: !canSave ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Bell size={15} color={tokens.primaryBtnText} strokeWidth={2.5} />
            <Text style={[styles.primaryBtnText, { color: tokens.primaryBtnText }]}>
              {saving ? 'Scheduling…' : existing ? 'Replace' : 'Set reminder'}
            </Text>
          </Pressable>
        </>
      }
    >
      {/* Existing reminder banner */}
      {existing && (
        <View
          style={[
            styles.existing,
            { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.35)' },
          ]}
        >
          <Bell size={14} color={accent.amber} strokeWidth={2} />
          <Text style={[styles.existingText, { color: tokens.textSecondary }]}>
            Reminds {formatReminderTime(existing.fireAt)}
          </Text>
          <Pressable
            onPress={handleCancelExisting}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel reminder"
          >
            <BellOff size={15} color={tokens.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      )}

      {/* Quick presets */}
      <View style={styles.presetRow}>
        {presets.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => {
              haptic('light')
              setFireAt(p.compute())
            }}
            style={({ pressed }) => [
              styles.presetChip,
              { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
              pressed && { backgroundColor: tokens.surface },
            ]}
          >
            <Text style={[styles.presetText, { color: tokens.textSecondary }]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Custom date + time rows */}
      <View style={styles.pickRow}>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={({ pressed }) => [
            styles.pickBtn,
            { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
            pressed && { backgroundColor: tokens.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Pick date"
        >
          <Calendar size={14} color={tokens.accentIcon} strokeWidth={2} />
          <Text style={[styles.pickText, { color: tokens.textPrimary }]}>{dateLabel}</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={({ pressed }) => [
            styles.pickBtn,
            { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
            pressed && { backgroundColor: tokens.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Pick time"
        >
          <Clock size={14} color={tokens.accentIcon} strokeWidth={2} />
          <Text style={[styles.pickText, { color: tokens.textPrimary }]}>{timeLabel}</Text>
        </Pressable>
      </View>

      <Text style={[styles.willRemind, { color: inFuture ? tokens.textMuted : accent.red }]}>
        {inFuture
          ? `Will remind ${formatReminderTime(fireAt.getTime())} — tapping the notification opens this ${record.type === 'text' ? 'note' : 'recording'}.`
          : 'That time is in the past — pick a future time.'}
      </Text>

      {!supported && (
        <View
          style={[
            styles.unsupported,
            { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.35)' },
          ]}
        >
          <Text style={[styles.unsupportedText, { color: tokens.textSecondary }]}>
            Expo Go can’t schedule notifications on Android — reminders switch on in the
            dev build (Step 34). The UI is ready; scheduling is disabled until then.
          </Text>
        </View>
      )}

      {/* Native pickers (v9 API: onValueChange on pick, onDismiss on cancel) */}
      {showDatePicker && (
        <DateTimePicker
          value={fireAt}
          mode="date"
          onValueChange={(_event, date) => {
            setShowDatePicker(false)
            if (date) {
              const next = new Date(fireAt)
              next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
              setFireAt(next)
            }
          }}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={fireAt}
          mode="time"
          onValueChange={(_event, date) => {
            setShowTimePicker(false)
            if (date) {
              const next = new Date(fireAt)
              next.setHours(date.getHours(), date.getMinutes(), 0, 0)
              setFireAt(next)
            }
          }}
          onDismiss={() => setShowTimePicker(false)}
        />
      )}
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  existing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  existingText: {
    flex: 1,
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pickText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  willRemind: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.md,
  },
  unsupported: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  unsupportedText: {
    fontSize: 11,
    lineHeight: 16,
  },
  ghostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  ghostBtnText: {
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
