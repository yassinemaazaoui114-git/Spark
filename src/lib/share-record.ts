import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'

import { extensionOf } from '@/storage/files'
import { stripStoredTimestampPrefix } from '@/storage/format'
import type { VoiceRecord } from '@/types'

// Share a record (PWA handleShareRecord port):
// - text notes → copy "name\n\ncontent" to the clipboard
// - audio → native share sheet with the audio file
// Returns the toast message to show, or null if the user cancelled.

export async function shareRecord(record: VoiceRecord): Promise<string | null> {
  const name = stripStoredTimestampPrefix(record.name)

  if (record.type === 'text') {
    // Content only — names are often auto-generated from the first line,
    // so including them would paste that line twice (unlike the PWA).
    await Clipboard.setStringAsync(record.textContent)
    return 'Copied to clipboard'
  }

  if (!record.audioUri) return 'Nothing to share'

  const available = await Sharing.isAvailableAsync()
  if (!available) return 'Sharing not available on this device'

  const ext = extensionOf(record.audioUri)
  try {
    await Sharing.shareAsync(record.audioUri, {
      mimeType: ext === 'wav' ? 'audio/wav' : 'audio/mp4',
      dialogTitle: `Spark recording: ${name}`,
    })
    return null // share sheet handled it — no toast needed
  } catch {
    return 'Could not share'
  }
}
