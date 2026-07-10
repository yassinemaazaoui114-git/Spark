// Formatting helpers + id generation — ported verbatim from the PWA.

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export function buildRecordName(userInput: string, createdAt: number): string {
  const trimmed = userInput.trim()
  if (!trimmed) return formatTimestamp(createdAt)
  return trimmed
}

// Old PWA records may carry a "YYYY-MM-DD HH:MM — " name prefix; keep them clean.
const TIMESTAMP_PREFIX_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+—\s+/

export function stripStoredTimestampPrefix(name: string): string {
  return name.replace(TIMESTAMP_PREFIX_RE, '')
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Handles hours — used by stats ("1h 23m")
export function formatLongDuration(sec: number): string {
  if (sec < 60) return `${Math.floor(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${h}h ${remM}m`
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatTimestamp(ts).split(' ')[0]
}
