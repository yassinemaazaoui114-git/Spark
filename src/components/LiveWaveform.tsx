import type { AudioRecorder } from 'expo-audio'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

// Live waveform during recording — scrolling vertical bars driven by the
// recorder's metering (dB), violet→fuchsia gradient like the PWA canvas
// version. Newest sample enters on the right, history scrolls left.

const NUM_BARS = 40
const POLL_MS = 80
const BOX_HEIGHT = 80 // matches the waveform box in RecordPanel
const MAX_BAR = BOX_HEIGHT * 0.8
const MIN_BAR = 2

// Map recorder metering (dB, ~-60..0 useful range) to 0..1
function dbToAmplitude(db: number): number {
  return Math.min(1, Math.max(0, (db + 50) / 50))
}

// Per-bar gradient: #8b5cf6 (violet) → #d946ef (fuchsia), left to right
function barColor(i: number): string {
  const ratio = NUM_BARS > 1 ? i / (NUM_BARS - 1) : 0
  const r = Math.round(139 + (217 - 139) * ratio)
  const g = Math.round(92 + (70 - 92) * ratio)
  const b = Math.round(246 + (239 - 246) * ratio)
  return `rgb(${r},${g},${b})`
}

type Props = {
  recorder: AudioRecorder
  paused: boolean
}

export function LiveWaveform({ recorder, paused }: Props) {
  const [bars, setBars] = useState<number[]>(() => Array(NUM_BARS).fill(0))
  const colors = useMemo(() => Array.from({ length: NUM_BARS }, (_, i) => barColor(i)), [])

  // Poll metering while actively recording; pausing freezes the trace.
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      let amp = 0
      try {
        const status = recorder.getStatus()
        amp = dbToAmplitude(status.metering ?? -160)
      } catch {
        // recorder not ready yet — draw silence
      }
      setBars((prev) => [...prev.slice(1), amp])
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [recorder, paused])

  return (
    <View style={[styles.row, paused && styles.paused]}>
      {bars.map((amp, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max(MIN_BAR, amp * MAX_BAR),
              backgroundColor: colors[i],
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  paused: {
    opacity: 0.25,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
})
