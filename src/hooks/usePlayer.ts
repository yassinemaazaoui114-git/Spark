import Constants, { ExecutionEnvironment } from 'expo-constants'
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

import { clearActive, registerActive } from '@/lib/playback-manager'
import {
  buildSegments,
  segmentsLength,
  toNative,
  toPresented,
  type TrimFields,
} from '@/lib/trim'

// Per-card playback. Performance-critical detail (Step 26.5): the native
// player is created lazily on FIRST interaction — mounting a list of 100
// cards creates zero native players. Released manually on unmount.

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

// Expo Go lacks the native AudioControlsService the lock-screen API needs —
// it exists only in dev/production builds where the expo-audio config plugin
// ran (Step 34). Calling it in Expo Go logs a native error on every play.
const LOCK_SCREEN_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

export type PlayerMeta = {
  title: string
  folderName?: string
}

// Non-destructive trim (Steps 32 + 32.5): playback runs over the record's
// playable segments — the trim window minus the removed middle (src/lib/trim).
// Every time the hook exposes is "presented" (segments laid end-to-end from
// 0), so the card's scrubber/labels show the edited audio as the whole track.

export type Player = {
  playing: boolean
  currentTime: number
  duration: number // falls back to the stored duration until loaded
  speed: number
  toggle: () => Promise<void>
  seekTo: (sec: number) => void
  skip: (delta: number) => void
  cycleSpeed: () => void
}

function applySpeed(player: AudioPlayer, rate: number) {
  // expo-audio exposes setPlaybackRate (with pitch correction) on native;
  // fall back to the playbackRate property just in case.
  const p = player as unknown as {
    setPlaybackRate?: (rate: number, quality?: string) => void
    playbackRate: number
  }
  if (typeof p.setPlaybackRate === 'function') {
    p.setPlaybackRate(rate, 'high')
  } else {
    p.playbackRate = rate
  }
}

const UNTRIMMED: TrimFields = { trimStart: null, trimEnd: null, cutStart: null, cutEnd: null }

export function usePlayer(
  recordId: string,
  uri: string,
  storedDurationSec: number,
  meta?: PlayerMeta,
  trim?: TrimFields
): Player {
  const playerRef = useRef<AudioPlayer | null>(null)
  const statusSubRef = useRef<{ remove: () => void } | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0) // presented (segment-relative)
  const [nativeDuration, setNativeDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(1) // default 1×

  const fields = trim ?? UNTRIMMED

  // The status listener lives as long as the player — read trim via a ref so
  // a re-trim (or restore) applies without recreating the native player.
  const trimRef = useRef(fields)
  trimRef.current = fields

  // Segments over Infinity stay correct while the native duration is unknown
  // (the last segment just has no known end yet).
  const segmentsFor = (full: number) =>
    buildSegments(full > 0 ? full : Infinity, trimRef.current)

  // Create the native player on first use and subscribe to its status.
  const ensurePlayer = useCallback((): AudioPlayer => {
    if (!playerRef.current) {
      const player = createAudioPlayer(uri)
      statusSubRef.current = player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (status.duration > 0) setNativeDuration(status.duration)
          const segs = buildSegments(
            status.duration > 0 ? status.duration : Infinity,
            trimRef.current
          )
          const last = segs[segs.length - 1]
          // Auto-stop at the trim end and rewind to the start of the audio
          // (a natural end-of-file stop is the player's own business)
          if (
            trimRef.current.trimEnd != null &&
            status.playing &&
            status.currentTime >= last.to - 0.05
          ) {
            player.pause()
            player.seekTo(segs[0].from)
            setPlaying(false)
            setCurrentTime(0)
            return
          }
          // Jump over the removed middle
          for (let i = 0; i < segs.length - 1; i++) {
            if (
              status.playing &&
              status.currentTime >= segs[i].to - 0.05 &&
              status.currentTime < segs[i + 1].from
            ) {
              player.seekTo(segs[i + 1].from)
              return
            }
          }
          setPlaying(status.playing)
          setCurrentTime(toPresented(status.currentTime, segs))
        }
      )
      playerRef.current = player
    }
    return playerRef.current
  }, [uri])

  // Manual release on unmount (no hook manages this player's lifetime).
  useEffect(() => {
    return () => {
      clearActive(recordId)
      statusSubRef.current?.remove()
      statusSubRef.current = null
      try {
        playerRef.current?.remove()
      } catch {
        // already released
      }
      playerRef.current = null
    }
  }, [recordId])

  // Presented duration = total playable length. Finite even before the native
  // duration loads whenever trimEnd is set; otherwise storedDurationSec
  // already holds the edited length (set on save).
  const segmentTotal = segmentsLength(segmentsFor(nativeDuration))
  const duration = Number.isFinite(segmentTotal) ? segmentTotal : storedDurationSec

  const toggle = useCallback(async () => {
    const player = ensurePlayer()
    if (playing) {
      player.pause()
      return
    }
    registerActive(recordId, () => player.pause())
    // Lock-screen / notification metadata (PWA Media Session port).
    // Android also needs this for sustained background playback.
    if (LOCK_SCREEN_SUPPORTED) {
      try {
        const p = player as unknown as {
          setActiveForLockScreen?: (
            active: boolean,
            metadata?: { title?: string; artist?: string; albumTitle?: string }
          ) => void
        }
        p.setActiveForLockScreen?.(true, {
          title: meta?.title ?? 'Recording',
          artist: 'Spark',
          albumTitle: meta?.folderName ?? 'Voice notes',
        })
      } catch {
        // Lock-screen controls are best-effort — playback works regardless
      }
    }
    // Start from the first playable segment on first play or after a finish
    if (currentTime <= 0.01 || (duration > 0 && currentTime >= duration - 0.1)) {
      await player.seekTo(segmentsFor(player.duration)[0].from)
      setCurrentTime(0)
    }
    applySpeed(player, PLAYBACK_SPEEDS[speedIdx])
    player.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, ensurePlayer, meta?.folderName, meta?.title, playing, recordId, speedIdx])

  const seekTo = useCallback(
    (sec: number) => {
      const player = ensurePlayer()
      const segs = segmentsFor(playerRef.current?.duration ?? 0)
      // Map the presented position onto the real timeline (never in a gap)
      const total = segmentsLength(segs)
      let presented = Math.max(0, sec)
      if (Number.isFinite(total)) presented = Math.min(presented, Math.max(0, total - 0.05))
      player.seekTo(toNative(presented, segs))
      setCurrentTime(presented)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ensurePlayer]
  )

  const skip = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(duration, currentTime + delta))
      seekTo(next)
    },
    [currentTime, duration, seekTo]
  )

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % PLAYBACK_SPEEDS.length
    setSpeedIdx(next)
    if (playerRef.current) {
      applySpeed(playerRef.current, PLAYBACK_SPEEDS[next])
    }
  }, [speedIdx])

  return {
    playing,
    currentTime,
    duration,
    speed: PLAYBACK_SPEEDS[speedIdx],
    toggle,
    seekTo,
    skip,
    cycleSpeed,
  }
}
