import { Directory, File, Paths } from 'expo-file-system'

// Audio files live in documentDirectory/recordings/, named by record id.
// The DB stores the resulting file:// URI.

function recordingsDir(): Directory {
  return new Directory(Paths.document, 'recordings')
}

export function ensureRecordingsDir(): Directory {
  const dir = recordingsDir()
  if (!dir.exists) {
    dir.create({ intermediates: true })
  }
  return dir
}

// Move a temp recording (from the recorder) into permanent storage.
// Returns the permanent file URI.
export function persistRecording(tempUri: string, recordId: string): string {
  const dir = ensureRecordingsDir()
  const ext = extensionOf(tempUri)
  const dest = new File(dir, `${recordId}.${ext}`)
  if (dest.exists) {
    dest.delete()
  }
  const src = new File(tempUri)
  src.move(dest)
  return dest.uri
}

export function deleteRecordingFile(uri: string): void {
  if (!uri) return
  try {
    const f = new File(uri)
    if (f.exists) {
      f.delete()
    }
  } catch {
    // Missing file is fine — the record is being deleted anyway.
  }
}

export function extensionOf(uri: string): string {
  const last = uri.split('/').pop() || ''
  const dot = last.lastIndexOf('.')
  return dot >= 0 ? last.slice(dot + 1).toLowerCase() : 'm4a'
}
