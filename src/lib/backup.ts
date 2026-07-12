import { File, Paths } from 'expo-file-system'
import * as LegacyFS from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import JSZip from 'jszip'

import { ensureRecordingsDir, extensionOf } from '@/storage/files'
import { ensureSeedFolders, getFolders, saveFolder } from '@/storage/folders'
import { getAllRecordIds, getRecords, saveRecord } from '@/storage/records'
import { addTags, getAllTags } from '@/storage/tags'
import type { Folder, VoiceRecord } from '@/types'

// Backup export/import — same zip layout as the PWA (src/lib/backup.ts there)
// so PWA backups migrate straight into the native app:
//   manifest.json   — app/version/exportedAt + folder list + tag list
//   metadata/<id>.json — per-record metadata (PWA fields + native extras)
//   audio/<id>.<ext>   — the audio file, named by record id
// Native-only record fields (type, textContent, archived, trim) ride along as
// extra JSON keys the PWA importer ignores.

// Shape of one metadata/<id>.json. Optional fields are absent in PWA backups.
type RecordMeta = {
  id: string
  name: string
  folderId: string
  durationSec: number
  createdAt: number
  pinned?: boolean
  tags?: string[]
  audioFile: string | null
  type?: 'audio' | 'text'
  textContent?: string
  archived?: boolean
  trimStart?: number | null
  trimEnd?: number | null
  cutStart?: number | null
  cutEnd?: number | null
}

type ManifestFolder = {
  id: string
  name: string
  icon: string
  createdAt: number
  isDefault?: boolean
  order: number
  parentId: string | null
  color?: string
}

export type ImportResult = {
  foldersImported: number
  recordsImported: number
  tagsImported: number
}

// Build the backup zip from all active data and hand it to the share sheet.
// Returns the number of records exported, or null if sharing is unavailable.
export async function exportBackup(): Promise<number | null> {
  if (!(await Sharing.isAvailableAsync())) return null

  const [folders, records, tags] = await Promise.all([getFolders(), getRecords(), getAllTags()])

  const zip = new JSZip()
  const manifest = {
    app: 'Spark',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
      createdAt: f.createdAt,
      isDefault: f.isDefault ?? false,
      order: f.order,
      parentId: f.parentId ?? null,
      color: f.color,
    })),
    tags,
    recordCount: records.length,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  for (const r of records) {
    let audioFile: string | null = null
    if (r.type === 'audio' && r.audioUri) {
      try {
        const src = new File(r.audioUri)
        if (src.exists) {
          const ext = extensionOf(r.audioUri)
          audioFile = `audio/${r.id}.${ext}`
          zip.file(audioFile, src.bytes())
        }
      } catch {
        // Unreadable audio — still export the metadata so the name/tags survive.
        audioFile = null
      }
    }
    zip.file(
      `metadata/${r.id}.json`,
      JSON.stringify(
        {
          id: r.id,
          name: r.name,
          folderId: r.folderId,
          durationSec: r.durationSec,
          createdAt: r.createdAt,
          pinned: r.pinned,
          tags: r.tags,
          audioFile,
          type: r.type,
          textContent: r.textContent,
          archived: r.archived,
          trimStart: r.trimStart,
          trimEnd: r.trimEnd,
          cutStart: r.cutStart,
          cutEnd: r.cutEnd,
        },
        null,
        2
      )
    )
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' })

  const date = new Date().toISOString().slice(0, 10)
  const out = new File(Paths.cache, `spark-backup-${date}.zip`)
  if (out.exists) out.delete()
  out.write(bytes)

  await Sharing.shareAsync(out.uri, {
    mimeType: 'application/zip',
    dialogTitle: 'Save Spark backup',
  })
  return records.length
}

// Merge a backup zip into existing data (never wipes): folders/records with
// known ids are skipped — including soft-deleted ones, so the trash can't
// spawn duplicates. Handles both native (.m4a) and PWA (.webm/.wav) audio.
export async function importBackup(zipUri: string): Promise<ImportResult> {
  // zipUri is the picker's content:// URI (copyToCacheDirectory is off in the
  // caller). Expo Go sandboxes both FileSystem APIs to the experience's own
  // directories, so a copied file:// in the shared DocumentPicker cache is
  // unreadable — but the legacy API reads a granted content:// URI through
  // Android's ContentResolver. Base64 handles the binary zip; hand it to JSZip.
  const base64 = await LegacyFS.readAsStringAsync(zipUri, { encoding: 'base64' })
  const zip = await JSZip.loadAsync(base64, { base64: true })

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('Not a Spark backup — missing manifest.json')
  const manifest = JSON.parse(await manifestFile.async('text')) as {
    folders?: ManifestFolder[]
    tags?: string[]
  }

  await ensureSeedFolders()

  // includeDeleted — a folder sitting in the trash still owns its id
  const existingFolderIds = new Set((await getFolders(true)).map((f) => f.id))
  let foldersImported = 0
  for (const f of manifest.folders ?? []) {
    if (existingFolderIds.has(f.id)) continue
    const folder: Folder = {
      id: f.id,
      name: f.name,
      icon: f.icon,
      createdAt: f.createdAt,
      isDefault: f.isDefault ?? false,
      order: f.order,
      parentId: f.parentId ?? null,
      color: f.color ?? '#8b5cf6',
      deletedAt: null,
    }
    await saveFolder(folder)
    foldersImported++
  }

  const tags = manifest.tags ?? []
  if (tags.length > 0) await addTags(tags)

  const existingRecordIds = new Set(await getAllRecordIds())
  const recordingsDir = ensureRecordingsDir()
  let recordsImported = 0

  const metaPaths = Object.keys(zip.files).filter(
    (p) => p.startsWith('metadata/') && p.endsWith('.json')
  )
  for (const metaPath of metaPaths) {
    const metaFile = zip.file(metaPath)
    if (!metaFile) continue
    const meta = JSON.parse(await metaFile.async('text')) as RecordMeta
    if (existingRecordIds.has(meta.id)) continue

    const type = meta.type === 'text' ? 'text' : 'audio'
    let audioUri = ''
    if (type === 'audio') {
      const audioFile = meta.audioFile ? zip.file(meta.audioFile) : null
      if (!audioFile) continue // audio note without audio — nothing to play
      const audioBytes = await audioFile.async('uint8array')
      const dest = new File(recordingsDir, `${meta.id}.${extensionOf(meta.audioFile!)}`)
      if (dest.exists) dest.delete()
      dest.write(audioBytes)
      audioUri = dest.uri
    }

    const record: VoiceRecord = {
      id: meta.id,
      name: meta.name,
      folderId: meta.folderId,
      audioUri,
      durationSec: meta.durationSec,
      createdAt: meta.createdAt,
      pinned: meta.pinned ?? false,
      tags: meta.tags ?? [],
      archived: meta.archived ?? false,
      type,
      textContent: meta.textContent ?? '',
      trimStart: meta.trimStart ?? null,
      trimEnd: meta.trimEnd ?? null,
      cutStart: meta.cutStart ?? null,
      cutEnd: meta.cutEnd ?? null,
      deletedAt: null,
    }
    await saveRecord(record)
    recordsImported++
  }

  return { foldersImported, recordsImported, tagsImported: tags.length }
}
