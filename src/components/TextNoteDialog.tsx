import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { FolderPickerList } from '@/components/FolderPickerList'
import { GlassDialog } from '@/components/GlassDialog'
import { TagInput } from '@/components/TagInput'
import { useToast } from '@/context/ToastContext'
import { getActiveFolderId } from '@/lib/active-folder'
import { haptic } from '@/lib/haptics'
import { getFolders } from '@/storage/folders'
import { uid } from '@/storage/format'
import { saveRecord } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// "New text note" dialog (PWA port) — multiline content, optional name
// (auto-generated from the first line if empty), tags, folder picker.

type Props = {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

export function TextNoteDialog({ visible, onClose, onSaved }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [folderId, setFolderId] = useState('inbox')
  const [folders, setFolders] = useState<Folder[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    // Fresh state per note
    setContent('')
    setName('')
    setTags([])
    setFolderId(getActiveFolderId() ?? 'inbox')
    setSaving(false)
    ;(async () => {
      setFolders(await getFolders())
      setAllTags(await getAllTags())
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const canSave = content.trim().length > 0 && !saving

  const handleSave = async () => {
    const trimmed = content.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      // Auto-generate name from the first line if not provided (PWA behavior)
      const finalName = name.trim() || trimmed.split('\n')[0].slice(0, 50)
      await saveRecord({
        id: uid(),
        name: finalName,
        folderId,
        audioUri: '',
        durationSec: 0,
        createdAt: Date.now(),
        pinned: false,
        tags,
        archived: false,
        type: 'text',
        textContent: trimmed,
        trimStart: null,
        trimEnd: null,
      })
      haptic('success')
      showToast('Note saved')
      onSaved()
    } catch {
      haptic('error')
      showToast('Could not save — try again')
      setSaving(false)
    }
  }

  return (
    <GlassDialog
      visible={visible}
      onRequestClose={onClose}
      title="New text note"
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Discard</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: !canSave ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Check size={16} color="#18181b" strokeWidth={2.5} />
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save note'}</Text>
          </Pressable>
        </>
      }
    >
      {/* Main content textarea */}
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        placeholderTextColor={tokens.textFaint}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        style={[
          styles.contentInput,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.borderStrong,
            color: tokens.textPrimary,
          },
        ]}
        autoFocus
      />

      {/* Optional name */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          Name (optional — auto-generated from first line if empty)
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Grocery list, Meeting notes..."
          placeholderTextColor={tokens.textFaint}
          style={[
            styles.nameInput,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.borderStrong,
              color: tokens.textPrimary,
            },
          ]}
        />
      </View>

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
  contentInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 110,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  nameInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
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
    backgroundColor: '#ffffff',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
})
