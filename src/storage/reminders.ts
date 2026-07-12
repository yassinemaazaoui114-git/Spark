import type { Reminder } from '@/types'

import { getDb } from './db'

// Reminder rows (Step 33). Notification scheduling/cancelling lives in
// src/lib/reminders.ts — this file is only the SQLite CRUD. The table has no
// deletedAt: rows are hard-deleted on cancel and swept once fireAt passes.

type ReminderRow = {
  id: string
  recordId: string
  fireAt: number
  notificationId: string
  createdAt: number
}

export async function getReminders(): Promise<Reminder[]> {
  const db = await getDb()
  return db.getAllAsync<ReminderRow>('SELECT * FROM reminders ORDER BY fireAt ASC')
}

export async function getReminderForRecord(recordId: string): Promise<Reminder | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE recordId = ? ORDER BY fireAt ASC',
    [recordId]
  )
  return row ?? null
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'INSERT INTO reminders (id, recordId, fireAt, notificationId, createdAt) VALUES (?, ?, ?, ?, ?)',
    [reminder.id, reminder.recordId, reminder.fireAt, reminder.notificationId, reminder.createdAt]
  )
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id])
}

// Sweep rows whose notification already fired (or was missed while the
// phone was off) — called on every app open.
export async function deleteExpiredReminders(now: number): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM reminders WHERE fireAt <= ?', [now])
}
