import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { Check, Pause, Play, RotateCcw } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { FolderPickerList } from '@/components/FolderPickerList'
import { GlassDialog } from '@/components/GlassDialog'
import { TagInput } from '@/components/TagInput'
import { useToast } from '@/context/ToastContext'
import type { FinishedRecording } from '@/hooks/useRecorder'
import { getActiveFolderId } from '@/lib/active-folder'
import { haptic } from '@/lib/haptics'
import { deleteRecordingFile, persistRecording } from '@/storage/files'
import { getFolders } from '@/storage/folders'
import { buildRecordName, formatDuration, uid } from '@/storage/format'
import { saveRecord } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// "Name this thought" — the post-recording save dialog (PWA port):
// duration line, preview/re-record, name, tags, folder picker, discard/save.

type Props = {
  pending: FinishedRecording | null
  onSaved: () => void
  onDiscarded: () => void
  onReRecord: () => void
}

export function SaveRecordingDialog({ pending, onSaved, onDiscarded, onReRecord }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [folderId, setFolderId] = useState('inbox')
  const [folders, setFolders] = useState<Folder[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Preview player — source swapped in whenever a new recording arrives
  const player = useAudioPlayer(null)
  const playerStatus = useAudioPlayerStatus(player)

  useEffect(() => {
    if (!pending) return
    // Fresh dialog state per recording — default into the currently open
    // folder (PWA: pendingFolderId = activeFolderId || 'inbox')
    setName('')
    setTags([])
    setFolderId(getActiveFolderId() ?? 'inbox')
    setSaving(false)
    player.replace(pending.uri)
    ;(async () => {
      setFolders(await getFolders())
      setAllTags(await getAllTags())
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.uri])

  const togglePreview = async () => {
    if (!pending) return
    haptic('light')
    if (playerStatus.playing) {
      player.pause()
      return
    }
    // Restart from the top if the previous preview ran to the end
    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.1) {
      await player.seekTo(0)
    }
    player.play()
  }

  const handleSave = async () => {
    if (!pending || saving) return
    setSaving(true)
    try {
      player.pause()
      const id = uid()
      const finalUri = persistRecording(pending.uri, id)
      await saveRecord({
        id,
        name: buildRecordName(name, pending.createdAt),
        folderId,
        audioUri: finalUri,
        durationSec: pending.durationSec,
        createdAt: pending.createdAt,
        pinned: false,
        tags,
        archived: false,
        type: 'audio',
        textContent: '',
        trimStart: null,
        trimEnd: null,
      })
      haptic('success')
      showToast('Saved')
      onSaved()
    } catch {
      haptic('error')
      showToast('Could not save — try again')
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (!pending) return
    player.pause()
    deleteRecordingFile(pending.uri)
    showToast('Discarded')
    onDiscarded()
  }

  const handleReRecord = () => {
    if (!pending) return
    player.pause()
    deleteRecordingFile(pending.uri)
    onReRecord()
  }

  return (
    <GlassDialog
      visible={!!pending}
      onRequestClose={handleDiscard}
      title="Name this thought"
      footer={
        <>
          <Pressable
            onPress={handleDiscard}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Discard</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: tokens.primaryBtnBg,
                opacity: saving ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Check size={16} color={tokens.primaryBtnText} strokeWidth={2.5} />
            <Text style={[styles.primaryBtnText, { color: tokens.primaryBtnText }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </>
      }
    >
      <Text style={[styles.metaLine, { color: tokens.textMuted }]}>
        Duration: {pending ? formatDuration(pending.durationSec) : ''} · Auto-timestamped
      </Text>

      {/* Preview + re-record */}
      <View style={styles.previewRow}>
        <Pressable
          onPress={togglePreview}
          style={({ pressed }) => [
            styles.previewBtn,
            {
              backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface,
              borderColor: tokens.borderStrong,
            },
          ]}
        >
          {playerStatus.playing ? (
            <Pause size={16} color={tokens.textPrimary} strokeWidth={2} />
          ) : (
            <Play size={16} color={tokens.textPrimary} strokeWidth={2} />
          )}
          <Text style={[styles.previewBtnText, { color: tokens.textPrimary }]}>
            {playerStatus.playing ? 'Stop preview' : 'Play back'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleReRecord}
          style={({ pressed }) => [
            styles.previewBtn,
            {
              backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
              borderColor: tokens.borderStrong,
            },
          ]}
        >
          <RotateCcw size={16} color={tokens.textSecondary} strokeWidth={2} />
          <Text style={[styles.previewBtnText, { color: tokens.textSecondary }]}>Re-record</Text>
        </Pressable>
      </View>

      {/* Name */}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. butterfly app idea, groceries, mom's recipe..."
        placeholderTextColor={tokens.textFaint}
        style={[
          styles.nameInput,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.borderStrong,
            color: tokens.textPrimary,
          },
        ]}
        autoFocus
      />
      <Text style={[styles.nameHint, { color: tokens.textFaint }]}>
        {name.trim()
          ? `Will save as: ${name.trim()}`
          : 'Leave empty to use the timestamp as the name.'}
      </Text>

      {/* Tags */}
      <View style={styles.section}>
        <TagInput tags={tags} onChange={setTags} allTags={allTags} />
      </View>

      {/* Folder picker */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>Save to folder</Text>
        <FolderPickerList
          folders={folders}
          selectedId={folderId}
          onSelect={(id) => id != null && setFolderId(id)}
        />
      </View>
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  metaLine: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  previewBtnText: {
    fontSize: 13,
  },
  nameInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  nameHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: spacing.sm,
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
