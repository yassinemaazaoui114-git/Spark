import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { FolderColorPicker } from '@/components/FolderColorPicker'
import { FolderIconPicker } from '@/components/FolderIconPicker'
import { FolderPickerList } from '@/components/FolderPickerList'
import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { getFolders, saveFolder } from '@/storage/folders'
import { uid } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// "New folder" dialog (PWA port) — name, 26-icon picker, 10-color picker,
// optional parent folder. Step 16 opens it with a locked parent for
// "Add sub-folder".

type Props = {
  visible: boolean
  defaultParentId?: string | null
  onClose: () => void
  onCreated: () => void
}

export function NewFolderDialog({ visible, defaultParentId = null, onClose, onCreated }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Folder')
  const [color, setColor] = useState('#8b5cf6')
  const [parentId, setParentId] = useState<string | null>(defaultParentId)
  const [folders, setFolders] = useState<Folder[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setName('')
    setIcon('Folder')
    setColor('#8b5cf6')
    setParentId(defaultParentId)
    setSaving(false)
    ;(async () => setFolders(await getFolders()))()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const canCreate = name.trim().length > 0 && !saving

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      // New folder goes last among its siblings (PWA behavior)
      const siblings = folders.filter((f) => (f.parentId ?? null) === (parentId ?? null))
      const maxOrder = siblings.reduce((m, f) => Math.max(m, f.order), -1)
      await saveFolder({
        id: uid(),
        name: trimmed,
        icon,
        color,
        createdAt: Date.now(),
        order: maxOrder + 1,
        parentId,
      })
      haptic('success')
      showToast('Folder created')
      onCreated()
    } catch {
      haptic('error')
      showToast('Could not create folder')
      setSaving(false)
    }
  }

  return (
    <GlassDialog
      visible={visible}
      onRequestClose={onClose}
      title={defaultParentId ? 'New sub-folder' : 'New folder'}
      footer={
        <>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: tokens.surfaceSubtle }]}
          >
            <Text style={[styles.ghostBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: !canCreate ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'Creating...' : 'Create'}</Text>
          </Pressable>
        </>
      }
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Folder name..."
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
        onSubmitEditing={handleCreate}
      />

      <View style={styles.section}>
        <FolderIconPicker value={icon} onChange={setIcon} />
      </View>

      <View style={styles.section}>
        <FolderColorPicker value={color} onChange={setColor} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          Parent folder (optional)
        </Text>
        <FolderPickerList
          folders={folders}
          selectedId={parentId}
          onSelect={setParentId}
          noneLabel="Top level (no parent)"
        />
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
