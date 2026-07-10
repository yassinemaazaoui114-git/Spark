import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { TagInput } from '@/components/TagInput'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { formatTimestamp, stripStoredTimestampPrefix } from '@/storage/format'
import { saveRecord } from '@/storage/records'
import { getAllTags } from '@/storage/tags'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { VoiceRecord } from '@/types'

// "Rename record" dialog (PWA port) — name + tag editing in one place.
// Save disabled until the name or tags actually change.

type Props = {
  record: VoiceRecord | null
  onClose: () => void
  onSaved: () => void
}

export function RenameRecordDialog({ record, onClose, onSaved }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!record) return
    setName(stripStoredTimestampPrefix(record.name))
    setTags(record.tags)
    setSaving(false)
    ;(async () => setAllTags(await getAllTags()))()
  }, [record])

  const unchanged =
    !!record &&
    name.trim() === stripStoredTimestampPrefix(record.name) &&
    JSON.stringify([...tags].sort()) === JSON.stringify([...record.tags].sort())
  const canSave = !!record && name.trim().length > 0 && !unchanged && !saving

  const handleSave = async () => {
    if (!record || !canSave) return
    setSaving(true)
    try {
      await saveRecord({ ...record, name: name.trim(), tags })
      haptic('success')
      showToast('Renamed')
      onSaved()
    } catch {
      haptic('error')
      showToast('Could not save — try again')
      setSaving(false)
    }
  }

  return (
    <GlassDialog
      visible={!!record}
      onRequestClose={onClose}
      title="Rename record"
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
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
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </>
      }
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Record name..."
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
      {record && (
        <Text style={[styles.dateNote, { color: tokens.textFaint }]}>
          Date: {formatTimestamp(record.createdAt)} (kept automatically)
        </Text>
      )}

      <View style={styles.section}>
        <TagInput tags={tags} onChange={setTags} allTags={allTags} label="Tags" />
      </View>
    </GlassDialog>
  )
}

const styles = StyleSheet.create({
  nameInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateNote: {
    fontSize: 11,
    marginTop: 6,
  },
  section: {
    marginTop: spacing.lg,
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
