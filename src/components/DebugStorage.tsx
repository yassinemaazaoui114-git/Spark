import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { GlassCard } from '@/components/GlassCard'
import { useToast } from '@/context/ToastContext'
import { haptic, type HapticPattern } from '@/lib/haptics'
import { uid } from '@/storage/format'
import { ensureSeedFolders, getFolders } from '@/storage/folders'
import { deleteRecord, getRecords, saveRecord } from '@/storage/records'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

// TEMPORARY — Step 4 test harness. Removed in Step 6 when the real
// recording UI takes over the home screen.

const HAPTIC_PATTERNS: HapticPattern[] = ['light', 'medium', 'heavy', 'success', 'warning', 'error']

export function DebugStorage() {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [folders, setFolders] = useState<Folder[]>([])
  const [records, setRecords] = useState<VoiceRecord[]>([])

  const refresh = useCallback(async () => {
    setFolders(await getFolders())
    setRecords(await getRecords())
  }, [])

  useEffect(() => {
    ;(async () => {
      await ensureSeedFolders()
      await refresh()
    })()
  }, [refresh])

  const addFake = async () => {
    const createdAt = Date.now()
    await saveRecord({
      id: uid(),
      name: `Test record ${records.length + 1}`,
      folderId: 'inbox',
      audioUri: '',
      durationSec: Math.floor(Math.random() * 180),
      createdAt,
      pinned: false,
      tags: ['test'],
      archived: false,
      type: 'text',
      textContent: 'Fake record created by the Step 4 debug panel.',
      trimStart: null,
      trimEnd: null,
    })
    await refresh()
  }

  const deleteNewest = async () => {
    if (records.length === 0) return
    await deleteRecord(records[0].id)
    await refresh()
  }

  return (
    <GlassCard style={{ marginTop: spacing.lg }}>
      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        Storage debug (Step 4)
      </Text>

      <Text style={[styles.section, { color: tokens.textFaint }]}>
        FOLDERS ({folders.length})
      </Text>
      {folders.map((f) => (
        <Text key={f.id} style={[styles.row, { color: tokens.textMuted }]}>
          {f.name} — {records.filter((r) => r.folderId === f.id).length} records
        </Text>
      ))}

      <Text style={[styles.section, { color: tokens.textFaint }]}>
        RECORDS ({records.length})
      </Text>
      {records.map((r) => (
        <Text key={r.id} style={[styles.row, { color: tokens.textMuted }]}>
          {r.name} · {r.durationSec}s · tags: {r.tags.join(', ') || '—'}
        </Text>
      ))}

      <View style={styles.buttons}>
        <Pressable onPress={addFake} style={[styles.btn, { backgroundColor: 'rgba(139,92,246,0.25)' }]}>
          <Text style={{ color: '#ddd6fe', fontSize: 12 }}>Add fake record</Text>
        </Pressable>
        <Pressable onPress={deleteNewest} style={[styles.btn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
          <Text style={{ color: accent.red, fontSize: 12 }}>Delete newest</Text>
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: tokens.textFaint }]}>
        Add a record, fully close the app, reopen — it must still be here.
      </Text>

      {/* Step 5: haptic + toast test buttons */}
      <Text style={[styles.section, { color: tokens.textFaint }]}>HAPTICS (STEP 5)</Text>
      <View style={styles.hapticRow}>
        {HAPTIC_PATTERNS.map((p) => (
          <Pressable
            key={p}
            onPress={() => haptic(p)}
            style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
          >
            <Text style={{ color: tokens.textSecondary, fontSize: 11 }}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => {
          haptic('success')
          showToast('Toast works — auto-dismisses in 2.5s')
        }}
        style={[styles.btn, { backgroundColor: 'rgba(16,185,129,0.2)', marginTop: spacing.sm, alignSelf: 'flex-start' }]}
      >
        <Text style={{ color: '#6ee7b7', fontSize: 12 }}>Show toast</Text>
      </Pressable>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    fontSize: 10,
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  row: {
    fontSize: 12,
    paddingVertical: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  hint: {
    fontSize: 10,
    marginTop: spacing.sm,
  },
  hapticRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
})
