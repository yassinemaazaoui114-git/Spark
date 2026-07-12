import { useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { haptic } from '@/lib/haptics'
import { formatDuration } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { radius } from '@/theme/tokens'

// Trim selection UI (PWA WaveformTrimmer). One pan gesture over the whole
// strip; touching grabs the nearest handle (PWA pointer logic). Expo Go can't
// decode audio amplitude, so the waveform is a deterministic voice-like
// silhouette seeded from the record id — same record, same shape, every open.

const TRIMMER_HEIGHT = 110
const NUM_BARS = 56
const MIN_GAP_SEC = 0.1
const BADGE_WIDTH = 48

// Deterministic PRNG (mulberry32) seeded from a string
function seededRandom(seed: string): () => number {
  let a = 2166136261
  for (let i = 0; i < seed.length; i++) {
    a ^= seed.charCodeAt(i)
    a = Math.imul(a, 16777619)
  }
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Smoothed random peaks with occasional quiet dips — reads as speech.
function buildPeaks(seed: string): number[] {
  const rand = seededRandom(seed)
  const peaks: number[] = []
  let prev = 0.5
  for (let i = 0; i < NUM_BARS; i++) {
    const quiet = rand() < 0.12 ? 0.3 : 1
    const target = (0.2 + 0.8 * rand()) * quiet
    const value = prev * 0.5 + target * 0.5
    peaks.push(Math.max(0.08, Math.min(1, value)))
    prev = value
  }
  return peaks
}

// Per-bar violet→fuchsia interpolation (PWA gradient)
function barColor(index: number): string {
  const ratio = NUM_BARS > 1 ? index / (NUM_BARS - 1) : 0
  const r = Math.round(139 + (217 - 139) * ratio)
  const g = Math.round(92 + (70 - 92) * ratio)
  const b = Math.round(246 + (239 - 246) * ratio)
  return `rgb(${r},${g},${b})`
}

type Props = {
  seed: string
  duration: number // full audio length in seconds
  start: number
  end: number
  onChange: (start: number, end: number) => void
  /** 'keep' (default): selection is what stays. 'remove': selection is cut out. */
  mode?: 'keep' | 'remove'
  /** Drag limits (remove mode: the existing trim window). Default 0..duration. */
  bounds?: { min: number; max: number }
}

export function WaveformTrimmer({
  seed,
  duration,
  start,
  end,
  onChange,
  mode = 'keep',
  bounds,
}: Props) {
  const { theme, tokens } = useTheme()
  const [width, setWidth] = useState(0)
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null)
  const dragTarget = useRef<'start' | 'end' | null>(null)

  const peaks = useMemo(() => buildPeaks(seed), [seed])

  const removing = mode === 'remove'
  const minTime = bounds?.min ?? 0
  const maxTime = bounds?.max ?? duration

  const light = theme === 'light'
  const dimColor = light ? 'rgba(245,240,255,0.6)' : 'rgba(10,5,20,0.45)'
  const inactiveBar = light ? 'rgba(26,11,46,0.15)' : 'rgba(255,255,255,0.14)'
  const selectionBorder = removing
    ? 'rgba(239,68,68,0.6)'
    : light
      ? 'rgba(139,92,246,0.45)'
      : 'rgba(255,255,255,0.35)'
  const handleBg = light ? 'rgba(109,40,217,0.75)' : 'rgba(255,255,255,0.75)'
  const handleBgActive = light ? 'rgba(109,40,217,0.95)' : 'rgba(255,255,255,0.92)'
  const gripColor = light ? 'rgba(255,255,255,0.8)' : 'rgba(139,92,246,0.7)'

  const xOf = (t: number) => (duration > 0 ? (t / duration) * width : 0)
  const startX = duration > 0 ? xOf(start) : 0
  const endX = duration > 0 ? xOf(end) : width
  const minX = xOf(minTime)
  const maxX = duration > 0 ? xOf(maxTime) : width

  const moveTo = (x: number) => {
    if (width === 0 || duration <= 0 || !dragTarget.current) return
    const raw = (Math.max(0, Math.min(width, x)) / width) * duration
    const t = Math.max(minTime, Math.min(maxTime, raw))
    if (dragTarget.current === 'start') {
      onChange(Math.max(minTime, Math.min(t, end - MIN_GAP_SEC)), end)
    } else {
      onChange(start, Math.min(maxTime, Math.max(t, start + MIN_GAP_SEC)))
    }
  }

  // Horizontal pan wins over the sheet's vertical scroll; vertical swipes fail
  // through. Gesture recreated each render so callbacks see fresh start/end.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onStart((e) => {
      const distStart = Math.abs(e.x - startX)
      const distEnd = Math.abs(e.x - endX)
      dragTarget.current = distStart <= distEnd ? 'start' : 'end'
      setActiveHandle(dragTarget.current)
      haptic('light')
      moveTo(e.x)
    })
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => {
      dragTarget.current = null
      setActiveHandle(null)
    })

  const barWidth = width > 0 ? width / NUM_BARS : 0

  const renderHandle = (x: number, which: 'start' | 'end') => {
    const active = activeHandle === which
    return (
      <View
        style={[
          styles.handle,
          {
            left: x - 4,
            backgroundColor: active ? handleBgActive : handleBg,
          },
          active && styles.handleGlow,
        ]}
        pointerEvents="none"
      >
        <View style={[styles.grip, { backgroundColor: gripColor }]} />
        <View style={[styles.grip, { backgroundColor: gripColor }]} />
      </View>
    )
  }

  const renderBadge = (x: number, sec: number) => (
    <View
      style={[
        styles.badge,
        {
          left: Math.max(0, Math.min(width - BADGE_WIDTH, x - BADGE_WIDTH / 2)),
          backgroundColor: light ? 'rgba(26,11,46,0.75)' : 'rgba(255,255,255,0.15)',
          borderColor: light ? 'rgba(26,11,46,0.2)' : 'rgba(255,255,255,0.2)',
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.badgeText}>{formatDuration(sec)}</Text>
    </View>
  )

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[
            styles.strip,
            { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.borderStrong },
          ]}
        >
          {width > 0 && (
            <>
              {/* Waveform bars — in keep mode the selection is kept (bright),
                  in remove mode the selection is what gets cut (dimmed) */}
              {peaks.map((peak, i) => {
                const x = i * barWidth
                const inSelection = x + barWidth >= startX && x <= endX
                const inBounds = x + barWidth >= minX && x <= maxX
                const kept = removing ? inBounds && !inSelection : inSelection
                const barHeight = Math.max(3, peak * TRIMMER_HEIGHT * 0.78)
                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: x + 0.5,
                      top: (TRIMMER_HEIGHT - barHeight) / 2,
                      width: Math.max(1.5, barWidth - 1.5),
                      height: barHeight,
                      borderRadius: 1.5,
                      backgroundColor: kept ? barColor(i) : inactiveBar,
                    }}
                  />
                )
              })}

              {/* Dim the discarded regions */}
              {removing ? (
                <>
                  {/* Outside the existing trim window (already cut by trim) */}
                  <View
                    style={[styles.dim, { left: 0, width: minX, backgroundColor: dimColor }]}
                    pointerEvents="none"
                  />
                  <View
                    style={[styles.dim, { left: maxX, right: 0, backgroundColor: dimColor }]}
                    pointerEvents="none"
                  />
                  {/* The middle being removed */}
                  <View
                    style={[
                      styles.dim,
                      { left: startX, width: Math.max(0, endX - startX), backgroundColor: dimColor },
                    ]}
                    pointerEvents="none"
                  />
                </>
              ) : (
                <>
                  <View
                    style={[styles.dim, { left: 0, width: startX, backgroundColor: dimColor }]}
                    pointerEvents="none"
                  />
                  <View
                    style={[styles.dim, { left: endX, right: 0, backgroundColor: dimColor }]}
                    pointerEvents="none"
                  />
                </>
              )}

              {/* Selection border */}
              <View
                style={[
                  styles.selectionBorder,
                  { left: startX, width: Math.max(0, endX - startX), borderColor: selectionBorder },
                ]}
                pointerEvents="none"
              />

              {renderHandle(startX, 'start')}
              {renderHandle(endX, 'end')}

              {renderBadge(startX, start)}
              {renderBadge(endX, end)}
            </>
          )}
        </View>
      </GestureDetector>

      {/* Times row */}
      <View style={styles.timesRow}>
        <Text style={[styles.timeText, { color: tokens.textFaint }]}>0:00</Text>
        <Text style={[styles.timeText, { color: tokens.textMuted }]}>
          {removing ? 'Removing' : 'Selected'}{' '}
          <Text style={{ color: tokens.textSecondary }}>
            {formatDuration(Math.max(0, end - start))}
          </Text>
        </Text>
        <Text style={[styles.timeText, { color: tokens.textFaint }]}>
          {formatDuration(duration)}
        </Text>
      </View>

      <Text style={[styles.hint, { color: tokens.textFaint }]}>
        {removing
          ? 'Drag the handles around the part to remove'
          : 'Drag the handles to select what to keep'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    height: TRIMMER_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: 2,
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
  },
  handleGlow: {
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  grip: {
    width: 1,
    height: TRIMMER_HEIGHT * 0.24,
  },
  badge: {
    position: 'absolute',
    top: 6,
    width: BADGE_WIDTH,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: '#ffffff',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
})
