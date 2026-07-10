import { useEffect, useState } from 'react'

import { FolderPickerList } from '@/components/FolderPickerList'
import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { getFolders } from '@/storage/folders'
import { moveRecord } from '@/storage/records'
import type { Folder, VoiceRecord } from '@/types'

// "Move to folder" — tapping a folder moves the record immediately (PWA).
// The current folder shows the check and does nothing.

type Props = {
  record: VoiceRecord | null
  onClose: () => void
  onMoved: () => void
}

export function MoveRecordDialog({ record, onClose, onMoved }: Props) {
  const { showToast } = useToast()
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    if (!record) return
    ;(async () => setFolders(await getFolders()))()
  }, [record])

  const handleSelect = async (folderId: string | null) => {
    if (!record || folderId == null || folderId === record.folderId) return
    await moveRecord(record.id, folderId)
    haptic('light')
    showToast('Moved')
    onMoved()
  }

  return (
    <GlassDialog visible={!!record} onRequestClose={onClose} title="Move to folder">
      <FolderPickerList
        folders={folders}
        selectedId={record?.folderId ?? null}
        onSelect={handleSelect}
      />
    </GlassDialog>
  )
}
