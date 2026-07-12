import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useEffect, useReducer } from 'react'
import { Platform } from 'react-native'

import { formatTimestamp, stripStoredTimestampPrefix, uid } from '@/storage/format'
import {
  addReminder,
  deleteExpiredReminders,
  deleteReminder,
  getReminders,
} from '@/storage/reminders'
import type { Reminder, VoiceRecord } from '@/types'

// Scheduled reminders (Step 33) — local notifications only, no push infra.
// The notification payload carries { recordId }; the root layout listens for
// taps and hands the id to the home screen via the pending-open store below,
// which shows the record in a highlighted section and auto-plays it.

// ⚠ expo-notifications cannot load inside Expo Go — SDK 53+ removed its push
// native module from the Go client and the package touches it during module
// evaluation (a static import crashed every route, since they all reach this
// file through RecordCard). Worse, the module console.errors on its own
// before throwing, so even a caught require still spams the log — we skip
// the require entirely in Expo Go (same gate as LOCK_SCREEN_SUPPORTED in
// usePlayer) and keep the try/catch as a fallback. The module loads for real
// in the dev build (Step 34), where reminders go live. Type-only imports of
// the package are safe (erased at compile time).
const NOTIFICATIONS_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

type NotificationsModule = typeof import('expo-notifications')
let notificationsCache: NotificationsModule | null | undefined
export function getNotifications(): NotificationsModule | null {
  if (notificationsCache === undefined) {
    if (!NOTIFICATIONS_SUPPORTED) {
      notificationsCache = null
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        notificationsCache = require('expo-notifications') as NotificationsModule
      } catch {
        notificationsCache = null
      }
    }
  }
  return notificationsCache
}

export function remindersSupported(): boolean {
  return getNotifications() != null
}

const CHANNEL_ID = 'reminders'

let channelReady = false
async function ensureChannel(): Promise<void> {
  const Notifications = getNotifications()
  if (!Notifications || Platform.OS !== 'android' || channelReady) return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8b5cf6',
  })
  channelReady = true
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications()
  if (!Notifications) return false
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

// Permission must already be granted (ReminderDialog requests it first).
export async function scheduleReminder(record: VoiceRecord, fireAt: number): Promise<Reminder> {
  const Notifications = getNotifications()
  if (!Notifications) throw new Error('Notifications unavailable in Expo Go')
  await ensureChannel()
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: stripStoredTimestampPrefix(record.name),
      body: record.type === 'text' ? 'Tap to read your note' : 'Tap to listen',
      data: { recordId: record.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId: CHANNEL_ID,
    },
  })
  const reminder: Reminder = {
    id: uid(),
    recordId: record.id,
    fireAt,
    notificationId,
    createdAt: Date.now(),
  }
  await addReminder(reminder)
  await refreshReminderIds()
  return reminder
}

export async function cancelReminder(reminder: Reminder): Promise<void> {
  const Notifications = getNotifications()
  if (Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId)
    } catch {
      // already fired or never scheduled — the row is what matters
    }
  }
  await deleteReminder(reminder.id)
  await refreshReminderIds()
}

// App-open sweep: rows whose fire time passed are done (fired or missed).
export async function cleanupExpiredReminders(): Promise<void> {
  await deleteExpiredReminders(Date.now())
  await refreshReminderIds()
}

// "Today 18:30" / "Tomorrow 09:00" / full timestamp
export function formatReminderTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const dayKey = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (dayKey(d) === dayKey(now)) return `Today ${hm}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (dayKey(d) === dayKey(tomorrow)) return `Tomorrow ${hm}`
  return formatTimestamp(ts)
}

// ---------- Pending-reminder ids (bell indicator on RecordCards) ----------

let reminderIds = new Set<string>()
const idListeners = new Set<() => void>()

export async function refreshReminderIds(): Promise<void> {
  try {
    const reminders = await getReminders()
    reminderIds = new Set(reminders.map((r) => r.recordId))
    idListeners.forEach((cb) => cb())
  } catch {
    // table not ready yet — indicators just stay hidden
  }
}

// Re-renders the caller whenever the set of reminded records changes.
export function useReminderIds(): Set<string> {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    idListeners.add(force)
    return () => {
      idListeners.delete(force)
    }
  }, [])
  return reminderIds
}

// ---------- Tap-to-open handoff (root layout → home screen) ----------

let pendingOpenId: string | null = null
const openListeners = new Set<(id: string) => void>()

export function setPendingOpenRecord(id: string): void {
  pendingOpenId = id
  openListeners.forEach((cb) => cb(id))
}

// Home screen: read-and-clear on mount (cold start already navigated home
// before the screen subscribed).
export function consumePendingOpenRecord(): string | null {
  const id = pendingOpenId
  pendingOpenId = null
  return id
}

export function onPendingOpenRecord(cb: (id: string) => void): () => void {
  openListeners.add(cb)
  return () => {
    openListeners.delete(cb)
  }
}
