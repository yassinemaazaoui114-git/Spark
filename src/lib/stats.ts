import type { Folder, VoiceRecord } from '@/types'

// Stats computation — full port of the PWA's stats useMemo. The Settings
// card uses the summary numbers; Step 28's stats sheet renders everything.

export type FolderStat = {
  folder: Folder
  count: number
  seconds: number
}

export type Stats = {
  totalRecords: number
  totalSeconds: number
  avgDuration: number
  perFolder: FolderStat[]
  topTag: [string, number] | null
  streak: number
  thisWeek: number
  pinnedCount: number
  voiceCount: number
  textCount: number
}

export function computeStats(records: VoiceRecord[], folders: Folder[]): Stats {
  const totalRecords = records.length
  const totalSeconds = records.reduce((sum, r) => sum + r.durationSec, 0)
  const avgDuration = totalRecords > 0 ? Math.round(totalSeconds / totalRecords) : 0

  // Per-folder breakdown (top-level folders only), busiest first
  const perFolder: FolderStat[] = folders
    .filter((f) => !f.parentId)
    .map((f) => {
      const folderRecords = records.filter((r) => r.folderId === f.id)
      return {
        folder: f,
        count: folderRecords.length,
        seconds: folderRecords.reduce((sum, r) => sum + r.durationSec, 0),
      }
    })
    .sort((a, b) => b.count - a.count)

  // Most-used tag
  const tagCounts: Record<string, number> = {}
  for (const r of records) {
    for (const t of r.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    }
  }
  const topEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]
  const topTag: [string, number] | null = topEntry ?? null

  // Recording streak — consecutive days with at least one record
  // (today is allowed to be empty, PWA behavior)
  const recordingDays = new Set(records.map((r) => new Date(r.createdAt).toDateString()))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (recordingDays.has(d.toDateString())) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = records.filter((r) => r.createdAt >= weekAgo).length
  const pinnedCount = records.filter((r) => r.pinned).length
  const voiceCount = records.filter((r) => r.type !== 'text').length
  const textCount = records.filter((r) => r.type === 'text').length

  return {
    totalRecords,
    totalSeconds,
    avgDuration,
    perFolder,
    topTag,
    streak,
    thisWeek,
    pinnedCount,
    voiceCount,
    textCount,
  }
}
