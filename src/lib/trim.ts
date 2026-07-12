// Non-destructive trim math (Steps 32 + 32.5). A record's playable audio is
// its trim window [trimStart, trimEnd] minus one removed middle range
// [cutStart, cutEnd] — up to two playable segments. Both the playback engine
// (usePlayer) and the TrimSheet preview run on these helpers, so what the
// preview plays is exactly what the saved record will play.
//
// "Presented" time is what the user sees: the playable segments laid
// end-to-end starting at 0, as if the removed audio never existed.

import type { VoiceRecord } from '@/types'

export type TrimFields = Pick<VoiceRecord, 'trimStart' | 'trimEnd' | 'cutStart' | 'cutEnd'>

export type PlaySegment = { from: number; to: number }

// `full` may be Infinity while the native duration is still unknown — every
// helper stays correct as long as trimEnd is set (and falls back gracefully
// when it isn't).
export function buildSegments(full: number, f: TrimFields): PlaySegment[] {
  const from = Math.max(0, f.trimStart ?? 0)
  const to = Math.max(from, f.trimEnd != null ? Math.min(f.trimEnd, full) : full)

  let segments: PlaySegment[] = [{ from, to }]
  if (f.cutStart != null && f.cutEnd != null) {
    const cs = Math.max(from, f.cutStart)
    const ce = Math.min(to, f.cutEnd)
    if (ce > cs) {
      segments = []
      if (cs - from > 0.01) segments.push({ from, to: cs })
      if (to - ce > 0.01) segments.push({ from: ce, to })
      if (segments.length === 0) segments = [{ from, to }] // cut ≥ window — ignore it
    }
  }
  return segments
}

export function segmentsLength(segments: PlaySegment[]): number {
  return segments.reduce((sum, s) => sum + (s.to - s.from), 0)
}

// Real timeline position → presented position
export function toPresented(native: number, segments: PlaySegment[]): number {
  let acc = 0
  for (const s of segments) {
    if (native < s.from) return acc
    if (native <= s.to) return acc + (native - s.from)
    acc += s.to - s.from
  }
  return acc
}

// Presented position → real timeline position (never lands inside a gap)
export function toNative(presented: number, segments: PlaySegment[]): number {
  let remaining = Math.max(0, presented)
  for (const s of segments) {
    const len = s.to - s.from
    if (remaining <= len) return s.from + remaining
    remaining -= len
  }
  return segments[segments.length - 1]?.to ?? 0
}
