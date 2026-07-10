import { Mic, Pause, Play, PenLine, Square } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { GlassCard } from '@/components/GlassCard'
import { LiveWaveform } from '@/components/LiveWaveform'
import { useToast } from '@/context/ToastContext'
import { haptic } from '@/lib/haptics'
import type { FinishedRecording, Recorder } from '@/hooks/useRecorder'
import { deleteRecordingFile } from '@/storage/files'
import { formatDuration } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { accent, radius, spacing } from '@/theme/tokens'

// The "What's the idea?" panel. Idle state (Step 6) + recording state (Step 7).
// The waveform box is filled by Step 8; saving goes through the dialog in Step 9.

type Props = {
  recorder: Recorder
  onFinished: (rec: FinishedRecording) => void
  onTypeNote: () => void
}

export function RecordPanel({ recorder, onFinished, onTypeNote }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const { phase, seconds } = recorder

  const handleStart = async () => {
    haptic('medium')
    const ok = await recorder.start()
    if (!ok) {
      haptic('error')
      showToast('Microphone permission denied')
    }
  }

  const handleStop = async () => {
    haptic('heavy')
    const rec = await recorder.stop()
    if (!rec) {
      showToast('Recording failed — try again')
      return
    }
    if (rec.durationSec < 1) {
      deleteRecordingFile(rec.uri)
      showToast('Recording too short — try again')
      return
    }
    onFinished(rec)
  }

  const handleCancel = async () => {
    haptic('warning')
    await recorder.cancel()
    showToast('Recording cancelled')
  }

  return (
    <GlassCard>
      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        What&apos;s the idea?
      </Text>
      <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
        Tap, talk, done. New notes land in inbox.
      </Text>

      {phase === 'idle' ? (
        <>
          {/* Big mic button */}
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.micButton,
              {
                backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
                borderColor: tokens.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start recording"
          >
            <View style={[styles.micCircle, { backgroundColor: tokens.surfaceStrong }]}>
              <Mic size={28} color={tokens.textPrimary} strokeWidth={2} />
            </View>
            <Text style={[styles.micCaption, { color: tokens.textSecondary }]}>
              TAP TO RECORD
            </Text>
          </Pressable>

          {/* "or type a note" */}
          <Pressable
            onPress={() => {
              haptic('light')
              onTypeNote()
            }}
            style={({ pressed }) => [
              styles.typeRow,
              pressed && { backgroundColor: tokens.surfaceSubtle },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Type a note instead"
          >
            <View style={[styles.divider, { backgroundColor: tokens.borderStrong }]} />
            <View style={styles.typeLabel}>
              <PenLine size={14} color={tokens.textFaint} strokeWidth={2} />
              <Text style={[styles.typeText, { color: tokens.textFaint }]}>
                or type a note
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: tokens.borderStrong }]} />
          </Pressable>
        </>
      ) : (
        <View style={styles.recordingWrap}>
          {/* Status row: pulsing red dot / amber when paused */}
          <View style={styles.statusRow}>
            <StatusDot paused={phase === 'paused'} />
            <Text style={[styles.statusText, { color: tokens.textSecondary }]}>
              {phase === 'paused' ? 'Paused' : 'Recording'}... {formatDuration(seconds)}
            </Text>
          </View>

          {/* Live waveform — metering-driven scrolling bars */}
          <View style={[styles.waveformBox, { borderColor: tokens.border }]}>
            <LiveWaveform recorder={recorder.audioRecorder} paused={phase === 'paused'} />
          </View>

          {/* Controls: Cancel pill · Pause/Resume circle · Stop circle */}
          <View style={styles.controls}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelPill,
                {
                  backgroundColor: pressed ? tokens.surfaceStrong : tokens.surfaceSubtle,
                  borderColor: tokens.borderStrong,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
            >
              <Text style={[styles.cancelText, { color: tokens.textSecondary }]}>Cancel</Text>
            </Pressable>

            {phase === 'paused' ? (
              <ControlCircle onPress={() => { haptic('light'); recorder.resume() }} label="Resume recording">
                <Play size={24} color={tokens.textSecondary} strokeWidth={2} style={{ marginLeft: 2 }} />
              </ControlCircle>
            ) : (
              <ControlCircle onPress={() => { haptic('light'); recorder.pause() }} label="Pause recording">
                <Pause size={24} color={tokens.textSecondary} strokeWidth={2} />
              </ControlCircle>
            )}

            <ControlCircle onPress={handleStop} label="Stop recording">
              <Square size={20} color={tokens.textSecondary} strokeWidth={2} />
            </ControlCircle>
          </View>

          <Text style={[styles.hint, { color: tokens.textFaint }]}>
            {phase === 'paused'
              ? 'Tap play to continue'
              : 'Tap pause to think, tap stop when done'}
          </Text>
        </View>
      )}
    </GlassCard>
  )
}

// Red pulsing dot while recording, steady amber while paused (PWA behavior).
function StatusDot({ paused }: { paused: boolean }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (paused) {
      cancelAnimation(opacity)
      opacity.value = 1
      return
    }
    opacity.value = withRepeat(withTiming(0.25, { duration: 600 }), -1, true)
    return () => cancelAnimation(opacity)
  }, [paused, opacity])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: paused ? accent.amber : '#ef4444' },
        style,
      ]}
    />
  )
}

function ControlCircle({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode
  onPress: () => void
  label: string
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlCircle,
        {
          backgroundColor: pressed ? tokens.surfaceStrong : tokens.surfaceSubtle,
          borderColor: tokens.borderStrong,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: spacing.xl,
  },
  micButton: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCaption: {
    fontSize: 11,
    letterSpacing: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  typeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 12,
  },
  divider: {
    width: 32,
    height: 1,
  },
  // ---- Recording state ----
  recordingWrap: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  waveformBox: {
    alignSelf: 'stretch',
    height: 80,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
  },
  controlCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 11,
  },
})
