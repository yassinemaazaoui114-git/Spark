// Core data models — ported from the PWA's storage.ts.
// One structural change: audioBlob (IndexedDB Blob) → audioUri (file path).

export type Folder = {
  id: string
  name: string
  icon: string // key into ICON_MAP (26 options)
  createdAt: number
  isDefault?: boolean // 'inbox' cannot be deleted
  order: number // sort position within same parent
  parentId: string | null // null = top-level
  color: string // hex accent
}

export type RecordType = 'audio' | 'text'

export type VoiceRecord = {
  id: string
  name: string
  folderId: string
  audioUri: string // file:// path ('' for text notes)
  durationSec: number
  createdAt: number
  pinned: boolean
  tags: string[]
  archived: boolean
  type: RecordType
  textContent: string
  // Non-destructive trim (null = untrimmed)
  trimStart: number | null
  trimEnd: number | null
}

export type SavedSearch = {
  id: string
  name: string
  query: string
  folderId?: string | null
  tag?: string | null
  durationFilter?: [number, number] | null
  createdAt: number
}

// Native-only (Step 33)
export type Reminder = {
  id: string
  recordId: string
  fireAt: number // epoch ms
  notificationId: string // expo-notifications id, used to cancel
  createdAt: number
}
