import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { FolderColorPicker } from '@/components/FolderColorPicker'
import { FolderIconPicker } from '@/components/FolderIconPicker'
import { GlassDialog } from '@/components/GlassDialog'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { saveFolder } from '@/storage/folders'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// "Edit folder" dialog (PWA rename-folder port) — name, icon, color,
// prefilled from the folder being edited. Save disabled until something changes.

type Props = {
  folder: Folder | null
  onClose: () => void
  onSaved: () => void
}

export function EditFolderDialog({ folder, onClose, onSaved }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Folder')
  const [color, setColor] = useState('#8b5cf6')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!folder) return
    setName(folder.name)
    setIcon(folder.icon)
    setColor(folder.color)
    setSaving(false)
  }, [folder])

  const unchanged =
    !!folder &&
    name.trim() === folder.name &&
    icon === folder.icon &&
    color === folder.color
  const canSave = !!folder && name.trim().length > 0 && !unchanged && !saving

  const handleSave = async () => {
    if (!folder || !canSave) return
    setSaving(true)
    try {
      await saveFolder({ ...folder, name: name.trim(), icon, color })
      haptic('success')
      showToast('Folder updated')
      onSaved()
    } catch {
      haptic('error')
      showToast('Could not update folder')
      setSaving(false)
    }
  }

  return (
    <GlassDialog
      visible={!!folder}
      onRequestClose={onClose}
      title="Edit folder"
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
              {
                backgroundColor: tokens.primaryBtnBg,
                opacity: !canSave ? 0.4 : pressed ? 0.85 : 1,
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
      />

      <View style={styles.section}>
        <FolderIconPicker value={icon} onChange={setIcon} />
      </View>

      <View style={styles.section}>
        <FolderColorPicker value={color} onChange={setColor} />
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
