import Slider from '@react-native-community/slider'
import {
  FastForward,
  Gauge,
  Hash,
  MoreVertical,
  Pause,
  PenLine,
  Pin,
  Play,
  Rewind,
  Scissors,
  Share2,
} from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { DeleteRecordDialog } from '@/components/DeleteRecordDialog'
import { MoveRecordDialog } from '@/components/MoveRecordDialog'
import { RecordActionSheet } from '@/components/RecordActionSheet'
import { RenameRecordDialog } from '@/components/RenameRecordDialog'
import { useToast } from '@/context/ToastContext'
import { usePlayer } from '@/hooks/usePlayer'
import { haptic } from '@/lib/haptics'
import { shareRecord } from '@/lib/share-record'
import {
  formatDuration,
  formatRelativeTime,
  formatTimestamp,
  stripStoredTimestampPrefix,
} from '@/storage/format'
import { saveRecord } from '@/storage/records'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'
import type { VoiceRecord } from '@/types'

// One record row — the heart of every list in the app (PWA RecordCard).
// Owns playback, the long-press action sheet, and the record dialogs;
// parents pass onChanged to refresh their lists after a mutation.

type Props = {
  record: VoiceRecord
  folderName?: string
  onChanged?: () => void
}

export function RecordCard({ record, folderName, onChanged }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)

  // Action sheet + dialogs
  const [showActions, setShowActions] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const openActions = () => {
    haptic('medium')
    setShowActions(true)
  }

  const changed = () => onChanged?.()

  const handleTogglePin = async () => {
    await saveRecord({ ...record, pinned: !record.pinned })
    haptic('light')
    showToast(record.pinned ? 'Unpinned' : 'Pinned to top')
    changed()
  }

  const handleToggleArchive = async () => {
    await saveRecord({ ...record, archived: !record.archived })
    haptic('light')
    showToast(record.archived ? 'Restored from archive' : 'Archived')
    changed()
  }

  const handleShare = async () => {
    const msg = await shareRecord(record)
    if (msg) {
      haptic('light')
      showToast(msg)
    }
  }

  const isTextNote = record.type === 'text'
  const name = stripStoredTimestampPrefix(record.name)
  const player = usePlayer(record.id, record.audioUri, record.durationSec, {
    title: name,
    folderName,
  })

  const metaParts = [
    isTextNote
      ? `"${(record.textContent || '').slice(0, 60)}${(record.textContent || '').length > 60 ? '…' : ''}"`
      : formatDuration(record.durationSec),
    formatRelativeTime(record.createdAt),
    folderName,
    expanded ? 'tap to collapse' : isTextNote ? 'tap to read' : 'long-press for actions',
  ].filter(Boolean)

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
      ]}
    >
      <View style={styles.topRow}>
        {/* Leading: play button (audio) or pen icon (text) */}
        {isTextNote ? (
          <View style={styles.penCircle}>
            <PenLine size={16} color="#93c5fd" strokeWidth={2} />
          </View>
        ) : (
          <Pressable
            onPress={() => {
              haptic('light')
              player.toggle()
            }}
            style={({ pressed }) => [
              styles.playCircle,
              { backgroundColor: tokens.surfaceStrong },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={player.playing ? 'Pause' : 'Play'}
          >
            {player.playing ? (
              <Pause size={16} color={tokens.textPrimary} strokeWidth={2} />
            ) : (
              <Play size={16} color={tokens.textPrimary} strokeWidth={2} style={{ marginLeft: 2 }} />
            )}
          </Pressable>
        )}

        {/* Body: name + timestamp + meta + tags. Tap toggles expand. */}
        <Pressable
          onPress={() => {
            setExpanded((x) => !x)
          }}
          onLongPress={openActions}
          delayLongPress={200}
          style={styles.body}
        >
          <View style={styles.nameRow}>
            {record.pinned && (
              <Pin size={12} color={accent.amber} fill={accent.amber} strokeWidth={2} />
            )}
            {isTextNote && (
              <View style={styles.noteBadge}>
                <Text style={styles.noteBadgeText}>NOTE</Text>
              </View>
            )}
            <Text style={[styles.name, { color: tokens.textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Text style={[styles.timestamp, { color: tokens.textFaint }]}>
            {formatTimestamp(record.createdAt)}
          </Text>
          <Text style={[styles.meta, { color: tokens.textMuted }]} numberOfLines={2}>
            {metaParts.join(' · ')}
          </Text>
          {record.tags.length > 0 && (
            <View style={styles.tagRow}>
              {record.tags.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Hash size={8} color="rgba(221,214,254,0.8)" strokeWidth={2} />
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* More button — opens the action sheet */}
        <Pressable
          onPress={openActions}
          hitSlop={8}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel="More actions"
        >
          <MoreVertical size={16} color={tokens.textFaint} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Expanded: full text for notes, playback controls for audio */}
      {expanded && (
        <View style={[styles.expandArea, { borderTopColor: tokens.border }]}>
          {isTextNote ? (
            <ScrollView
              style={[
                styles.textBox,
                { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
              ]}
              nestedScrollEnabled
            >
              <Text style={[styles.textContent, { color: tokens.textSecondary }]}>
                {record.textContent}
              </Text>
            </ScrollView>
          ) : (
            <>
              {/* Scrub bar */}
              <View style={styles.scrubRow}>
                <Text style={[styles.scrubTime, { color: tokens.textMuted }]}>
                  {formatDuration(player.currentTime)}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={Math.max(player.duration, 0.1)}
                  value={Math.min(player.currentTime, player.duration)}
                  onSlidingComplete={(v) => player.seekTo(v)}
                  minimumTrackTintColor="#ffffff"
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor="#ffffff"
                />
                <Text style={[styles.scrubTime, { color: tokens.textMuted }]}>
                  {formatDuration(player.duration)}
                </Text>
              </View>

              {/* Controls: -5s · play/pause · +5s · speed · trim · share */}
              <View style={styles.controls}>
                <Pressable
                  onPress={() => player.skip(-5)}
                  style={({ pressed }) => [
                    styles.skipBtn,
                    { borderColor: tokens.border, backgroundColor: tokens.surfaceSubtle },
                    pressed && { backgroundColor: tokens.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back 5 seconds"
                >
                  <Rewind size={16} color={tokens.textSecondary} strokeWidth={2} />
                </Pressable>

                <Pressable
                  onPress={() => player.toggle()}
                  style={({ pressed }) => [styles.bigPlayBtn, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={player.playing ? 'Pause' : 'Play'}
                >
                  {player.playing ? (
                    <Pause size={20} color="#ede9fe" strokeWidth={2} />
                  ) : (
                    <Play size={20} color="#ede9fe" strokeWidth={2} style={{ marginLeft: 2 }} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => player.skip(5)}
                  style={({ pressed }) => [
                    styles.skipBtn,
                    { borderColor: tokens.border, backgroundColor: tokens.surfaceSubtle },
                    pressed && { backgroundColor: tokens.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Forward 5 seconds"
                >
                  <FastForward size={16} color={tokens.textSecondary} strokeWidth={2} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    haptic('light')
                    player.cycleSpeed()
                  }}
                  style={({ pressed }) => [
                    styles.pillBtn,
                    { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Playback speed"
                >
                  <Gauge size={13} color={tokens.textPrimary} strokeWidth={2} />
                  <Text style={[styles.pillText, { color: tokens.textPrimary }]}>
                    {player.speed}×
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => showToast('Trim arrives in Step 32')}
                  style={({ pressed }) => [
                    styles.pillBtn,
                    { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Trim audio"
                >
                  <Scissors size={13} color={tokens.textPrimary} strokeWidth={2} />
                  <Text style={[styles.pillText, { color: tokens.textPrimary }]}>Trim</Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [
                    styles.pillBtn,
                    { backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Share audio"
                >
                  <Share2 size={13} color={tokens.textPrimary} strokeWidth={2} />
                  <Text style={[styles.pillText, { color: tokens.textPrimary }]}>Share</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* Action sheet + dialogs */}
      <RecordActionSheet
        record={record}
        visible={showActions}
        onClose={() => setShowActions(false)}
        onPin={handleTogglePin}
        onRename={() => setShowRename(true)}
        onMove={() => setShowMove(true)}
        onShare={handleShare}
        onTrim={() => showToast('Trim arrives in Step 32')}
        onArchive={handleToggleArchive}
        onDelete={() => setShowDelete(true)}
      />

      <MoveRecordDialog
        record={showMove ? record : null}
        onClose={() => setShowMove(false)}
        onMoved={() => {
          setShowMove(false)
          changed()
        }}
      />

      <RenameRecordDialog
        record={showRename ? record : null}
        onClose={() => setShowRename(false)}
        onSaved={() => {
          setShowRename(false)
          changed()
        }}
      />

      <DeleteRecordDialog
        record={showDelete ? record : null}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          setShowDelete(false)
          changed()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  penCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noteBadge: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  noteBadgeText: {
    fontSize: 8,
    letterSpacing: 1,
    color: 'rgba(147,197,253,0.6)',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  tagText: {
    fontSize: 10,
    color: 'rgba(221,214,254,0.8)',
  },
  moreBtn: {
    padding: 4,
  },
  expandArea: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  textBox: {
    maxHeight: 240,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  // ---- Playback controls ----
  scrubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  scrubTime: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    width: 36,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 28,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skipBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },
})
