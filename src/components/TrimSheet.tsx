import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio'
import { Check, Crop, Eraser, Pause, Play, Plus, Scissors } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { WaveformTrimmer } from '@/components/WaveformTrimmer'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import { clearActive, registerActive } from '@/lib/playback-manager'
import { buildSegments, segmentsLength, type PlaySegment, type TrimFields } from '@/lib/trim'
import { formatDuration, stripStoredTimestampPrefix, uid } from '@/storage/format'
import { saveRecord } from '@/storage/records'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { VoiceRecord } from '@/types'

// Trim v1 (Steps 32 + 32.5) — non-destructive, Expo Go-safe. Two edit modes:
// "Keep selection" sets the trim window (trimStart/trimEnd), "Remove middle"
// cuts a range out of that window (cutStart/cutEnd) — playback skips it.
// A removal that touches a window edge is normalized into a plain trim, so
// the data stays canonical. "Save as new record" shares the same audio file
// (the trash layer refuses to delete a file another record still points at);
// applying to the original just updates metadata — always reversible.

const EDGE_TOLERANCE = 0.05 // within 50ms of an edge counts as "untrimmed"

type EditMode = 'keep' | 'remove'
type SaveMode = 'copy' | 'replace'

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

type Props = {
  record: VoiceRecord | null
  onClose: () => void
  onSaved: () => void
}

export function TrimSheet({ record, onClose, onSaved }: Props) {
  const { theme, tokens } = useTheme()
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()

  const [fullDuration, setFullDuration] = useState<number | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('keep')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [saveMode, setSaveMode] = useState<SaveMode | null>(null)
  const [saving, setSaving] = useState(false)

  const playerRef = useRef<AudioPlayer | null>(null)
  const previewingRef = useRef(false)
  const segsRef = useRef<PlaySegment[]>([])
  previewingRef.current = previewing

  const previewId = record ? `trim-preview-${record.id}` : ''

  // Load the audio once per open: the player doubles as duration source
  // (record.durationSec may already be an edited length) and preview engine.
  useEffect(() => {
    if (!record) return
    setFullDuration(null)
    setEditMode('keep')
    setStart(0)
    setEnd(0)
    setPreviewing(false)
    setSaveMode(null)
    setSaving(false)

    const player = createAudioPlayer(record.audioUri)
    playerRef.current = player
    const trimStart = record.trimStart
    const trimEnd = record.trimEnd

    let ready = false
    const init = (duration: number) => {
      if (ready) return
      ready = true
      setFullDuration(duration)
      setStart(Math.max(0, Math.min(trimStart ?? 0, duration - 0.1)))
      setEnd(Math.max(0.1, Math.min(trimEnd ?? duration, duration)))
    }

    const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.duration > 0) init(status.duration)
      // Preview plays the candidate result: skip its gap, stop at its end
      if (previewingRef.current && status.playing) {
        const segs = segsRef.current
        if (segs.length > 0) {
          const last = segs[segs.length - 1]
          if (status.currentTime >= last.to - 0.03) {
            player.pause()
            setPreviewing(false)
            return
          }
          for (let i = 0; i < segs.length - 1; i++) {
            if (
              status.currentTime >= segs[i].to - 0.03 &&
              status.currentTime < segs[i + 1].from
            ) {
              player.seekTo(segs[i + 1].from)
              break
            }
          }
        }
      }
    })
    // Some sources report duration without emitting a status update — poll
    // briefly as a fallback.
    const poll = setInterval(() => {
      if (player.isLoaded && player.duration > 0) {
        init(player.duration)
        clearInterval(poll)
      }
    }, 150)
    const giveUp = setTimeout(() => clearInterval(poll), 8000)

    return () => {
      sub.remove()
      clearInterval(poll)
      clearTimeout(giveUp)
      clearActive(`trim-preview-${record.id}`)
      try {
        player.remove()
      } catch {
        // already released
      }
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id])

  if (!record) return null

  const name = stripStoredTimestampPrefix(record.name)
  const loaded = fullDuration != null

  // The saved trim window — remove-mode handles live inside it
  const winFrom = Math.max(0, record.trimStart ?? 0)
  const winTo = fullDuration != null ? Math.min(record.trimEnd ?? fullDuration, fullDuration) : 0

  // ---- Candidate fields: what the record would look like if saved now ----
  let candidate: TrimFields | null = null
  let removingAll = false
  if (fullDuration != null) {
    if (editMode === 'keep') {
      const ts = start <= EDGE_TOLERANCE ? null : round2(start)
      const te = end >= fullDuration - EDGE_TOLERANCE ? null : round2(end)
      // Preserve an existing middle cut, clamped into the reshaped window
      let cs = record.cutStart
      let ce = record.cutEnd
      if (cs != null && ce != null) {
        cs = Math.max(cs, ts ?? 0)
        ce = Math.min(ce, te ?? fullDuration)
        if (ce - cs < EDGE_TOLERANCE) {
          cs = null
          ce = null
        }
      } else {
        cs = null
        ce = null
      }
      candidate = { trimStart: ts, trimEnd: te, cutStart: cs, cutEnd: ce }
    } else {
      const cs = clamp(start, winFrom, winTo)
      const ce = clamp(end, winFrom, winTo)
      const ts = record.trimStart == null ? null : round2(record.trimStart)
      const te = record.trimEnd == null ? null : round2(record.trimEnd)
      removingAll = cs <= winFrom + EDGE_TOLERANCE && ce >= winTo - EDGE_TOLERANCE
      if (cs <= winFrom + EDGE_TOLERANCE) {
        // Removal touches the window start → it's really a trim start
        candidate = { trimStart: round2(ce), trimEnd: te, cutStart: null, cutEnd: null }
      } else if (ce >= winTo - EDGE_TOLERANCE) {
        // Removal touches the window end → it's really a trim end
        candidate = { trimStart: ts, trimEnd: round2(cs), cutStart: null, cutEnd: null }
      } else {
        candidate = { trimStart: ts, trimEnd: te, cutStart: round2(cs), cutEnd: round2(ce) }
      }
    }
  }

  const candidateSegments =
    candidate != null && fullDuration != null ? buildSegments(fullDuration, candidate) : []
  segsRef.current = candidateSegments
  const effectiveLen = segmentsLength(candidateSegments)

  const sameSide = (a: number | null | undefined, b: number | null) =>
    (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < EDGE_TOLERANCE)
  const unchanged =
    candidate != null &&
    sameSide(record.trimStart, candidate.trimStart) &&
    sameSide(record.trimEnd, candidate.trimEnd) &&
    sameSide(record.cutStart, candidate.cutStart) &&
    sameSide(record.cutEnd, candidate.cutEnd)

  const selectionValid = loaded && !removingAll && effectiveLen >= 0.1
  const canSave = selectionValid && !saving && saveMode != null && !unchanged

  const switchMode = (mode: EditMode) => {
    if (mode === editMode || fullDuration == null) return
    haptic('light')
    stopPreview()
    setEditMode(mode)
    if (mode === 'remove') {
      if (record.cutStart != null && record.cutEnd != null) {
        setStart(clamp(record.cutStart, winFrom, winTo))
        setEnd(clamp(record.cutEnd, winFrom, winTo))
      } else {
        // Default: the middle third of the window
        const len = winTo - winFrom
        setStart(winFrom + len / 3)
        setEnd(winFrom + (2 * len) / 3)
      }
    } else {
      setStart(winFrom)
      setEnd(winTo)
    }
  }

  const togglePreview = () => {
    const player = playerRef.current
    if (!player || !loaded || candidateSegments.length === 0) return
    haptic('light')
    if (previewing) {
      player.pause()
      setPreviewing(false)
      return
    }
    registerActive(previewId, () => {
      player.pause()
      setPreviewing(false)
    })
    player.seekTo(candidateSegments[0].from)
    player.play()
    setPreviewing(true)
  }

  const stopPreview = () => {
    playerRef.current?.pause()
    setPreviewing(false)
  }

  const handleClose = () => {
    stopPreview()
    onClose()
  }

  const performTrim = async () => {
    if (!canSave || fullDuration == null || saveMode == null || candidate == null) return
    setSaving(true)
    stopPreview()
    try {
      if (saveMode === 'replace') {
        await saveRecord({ ...record, ...candidate, durationSec: effectiveLen })
        const restored =
          candidate.trimStart == null && candidate.trimEnd == null && candidate.cutStart == null
        showToast(
          restored
            ? 'Full audio restored'
            : candidate.cutStart != null
              ? 'Middle removed'
              : 'Trim applied'
        )
      } else {
        await saveRecord({
          ...record,
          ...candidate,
          id: uid(),
          name: `${name} (trimmed)`,
          createdAt: Date.now(),
          pinned: false,
          durationSec: effectiveLen,
          deletedAt: null,
        })
        showToast('Saved as new record')
      }
      haptic('success')
      onSaved()
    } catch (e) {
      console.error('[trim] save failed:', e)
      haptic('error')
      showToast('Could not save the trim')
      setSaving(false)
    }
  }

  const light = theme === 'light'
  const emeraldIcon = light ? '#047857' : '#6ee7b7'
  const fuchsiaIcon = light ? '#a21caf' : '#f0abfc'
  const removing = editMode === 'remove'

  const renderModePill = (mode: EditMode, Icon: typeof Crop, label: string) => {
    const active = editMode === mode
    return (
      <Pressable
        onPress={() => switchMode(mode)}
        style={[
          styles.modePill,
          active
            ? { backgroundColor: tokens.accentTint, borderColor: tokens.accentBorder }
            : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Icon
          size={13}
          color={active ? tokens.accentIcon : tokens.textMuted}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.modePillText,
            { color: active ? tokens.accentTextStrong : tokens.textMuted },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    )
  }

  const renderSaveCard = (
    mode: SaveMode,
    Icon: typeof Plus,
    tint: string,
    iconColor: string,
    activeBorder: string,
    title: string,
    desc: string
  ) => {
    const active = saveMode === mode
    return (
      <Pressable
        onPress={() => {
          haptic('light')
          setSaveMode(mode)
        }}
        style={[
          styles.modeCard,
          active
            ? { backgroundColor: tint, borderColor: activeBorder }
            : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={[styles.modeIcon, { backgroundColor: active ? tint : tokens.surface }]}>
          <Icon size={16} color={active ? iconColor : tokens.textMuted} strokeWidth={2} />
        </View>
        <View style={styles.modeBody}>
          <Text style={[styles.modeTitle, { color: tokens.textPrimary }]}>{title}</Text>
          <Text style={[styles.modeDesc, { color: tokens.textMuted }]}>{desc}</Text>
        </View>
        <View
          style={[
            styles.radio,
            active
              ? { borderColor: iconColor, backgroundColor: iconColor }
              : { borderColor: tokens.borderStrong },
          ]}
        >
          {active && <Check size={12} color={light ? '#ffffff' : '#18181b'} strokeWidth={3} />}
        </View>
      </Pressable>
    )
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={handleClose}>
      {/* GestureHandlerRootView: RN Modals host a separate native view tree on
          Android — without this the trimmer's pan gesture never activates. */}
      <GestureHandlerRootView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.sheet,
              borderColor: tokens.sheetBorder,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={[styles.handleBar, { backgroundColor: tokens.borderStrong }]} />

          <Text style={[styles.title, { color: tokens.textPrimary }]}>Trim audio</Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]} numberOfLines={1}>
            {name}
            {loaded ? ` · ${formatDuration(fullDuration)}` : ''}
          </Text>

          {!loaded ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={tokens.accentIconSoft} />
              <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
                Loading audio…
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scroll}
            >
              {/* Edit mode: keep the selection vs cut it out of the middle */}
              <View style={styles.modeToggle}>
                {renderModePill('keep', Crop, 'Keep selection')}
                {renderModePill('remove', Eraser, 'Remove middle')}
              </View>

              <WaveformTrimmer
                seed={record.id}
                duration={fullDuration}
                start={start}
                end={end}
                mode={editMode}
                bounds={removing ? { min: winFrom, max: winTo } : undefined}
                onChange={(s, e) => {
                  setStart(s)
                  setEnd(e)
                }}
              />

              {/* Selection summary */}
              <View
                style={[
                  styles.summary,
                  { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
                ]}
              >
                <Text style={[styles.summaryTimes, { color: tokens.textPrimary }]}>
                  {formatDuration(start)}
                  <Text style={{ color: tokens.textFaint }}> → </Text>
                  {formatDuration(end)}
                </Text>
                <Text style={[styles.summaryMeta, { color: tokens.textMuted }]}>
                  {removing
                    ? `Removing ${formatDuration(Math.max(0, end - start))} · Keeps ${formatDuration(effectiveLen)}`
                    : `Selected: ${formatDuration(effectiveLen)} · Cuts ${formatDuration(Math.max(0, fullDuration - effectiveLen))} of dead air`}
                </Text>
              </View>

              {/* Preview the exact result */}
              <Pressable
                onPress={togglePreview}
                disabled={!selectionValid}
                style={({ pressed }) => [
                  styles.previewBtn,
                  { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
                  pressed && { backgroundColor: tokens.surfaceStrong },
                  !selectionValid && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={previewing ? 'Stop preview' : 'Preview result'}
              >
                {previewing ? (
                  <Pause size={15} color={tokens.textPrimary} strokeWidth={2} />
                ) : (
                  <Play size={15} color={tokens.textPrimary} strokeWidth={2} />
                )}
                <Text style={[styles.previewText, { color: tokens.textPrimary }]}>
                  {previewing ? 'Stop preview' : 'Preview result'}
                </Text>
              </Pressable>

              <Text style={[styles.note, { color: tokens.textFaint }]}>
                Trimming is non-destructive — the full audio always stays on your phone.
              </Text>

              {/* Save mode */}
              <Text style={[styles.modeLabel, { color: tokens.textMuted }]}>
                Choose how to save
              </Text>
              {renderSaveCard(
                'copy',
                Plus,
                'rgba(16,185,129,0.15)',
                emeraldIcon,
                'rgba(52,211,153,0.6)',
                'Save as new record',
                `Keeps this record unchanged. New record named “${name} (trimmed)”.`
              )}
              {renderSaveCard(
                'replace',
                Scissors,
                'rgba(217,70,239,0.15)',
                fuchsiaIcon,
                'rgba(232,121,249,0.6)',
                removing ? 'Remove from this record' : 'Trim this record',
                removing
                  ? 'Playback skips the removed part. Re-trim anytime to adjust or restore.'
                  : 'Plays only the selection. Re-trim anytime to adjust or restore the full audio.'
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: tokens.border },
                pressed && { backgroundColor: tokens.surfaceSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.cancelText, { color: tokens.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={performTrim}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: tokens.primaryBtnBg },
                pressed && { opacity: 0.85 },
                !canSave && { opacity: 0.4 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save trim"
            >
              {saving ? (
                <ActivityIndicator size="small" color={tokens.primaryBtnText} />
              ) : (
                <Scissors size={14} color={tokens.primaryBtnText} strokeWidth={2} />
              )}
              <Text style={[styles.saveText, { color: tokens.primaryBtnText }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
  },
  scroll: {
    flexGrow: 0,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  summaryTimes: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  summaryMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '500',
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modeLabel: {
    fontSize: 11,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  modeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  modeBody: {
    flex: 1,
    minWidth: 0,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  modeDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
