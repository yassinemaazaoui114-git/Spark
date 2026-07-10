import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

import { clearActive, registerActive } from '@/lib/playback-manager'

// Expo Go lacks the native AudioControlsService the lock-screen API needs —
// it exists only in dev/production builds where the expo-audio config plugin
// ran (Step 34). Calling it in Expo Go logs a native error on every play.
const LOCK_SCREEN_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

// Per-card playback — lazy-loads the source on first play, registers with
// the singleton manager, exposes scrub/skip/speed (PWA RecordCard port).

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

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

export type PlayerMeta = {
  title: string
  folderName?: string
}

export function usePlayer(
  recordId: string,
  uri: string,
  storedDurationSec: number,
  meta?: PlayerMeta
): Player {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)
  const loadedRef = useRef(false)
  const [speedIdx, setSpeedIdx] = useState(1) // default 1×

  // Release the manager slot when the card unmounts (the hook releases the
  // native player itself).
  useEffect(() => {
    return () => clearActive(recordId)
  }, [recordId])

  const ensureLoaded = useCallback(() => {
    if (!loadedRef.current) {
      player.replace(uri)
      loadedRef.current = true
    }
  }, [player, uri])

  const applySpeed = useCallback(
    (rate: number) => {
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
    },
    [player]
  )

  const toggle = useCallback(async () => {
    if (status.playing) {
      player.pause()
      return
    }
    ensureLoaded()
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
    // Restart from the top when the last run finished
    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
      await player.seekTo(0)
    }
    applySpeed(PLAYBACK_SPEEDS[speedIdx])
    player.play()
  }, [applySpeed, ensureLoaded, meta?.folderName, meta?.title, player, recordId, speedIdx, status])

  const seekTo = useCallback(
    (sec: number) => {
      ensureLoaded()
      player.seekTo(Math.max(0, sec))
    },
    [ensureLoaded, player]
  )

  const duration = status.duration > 0 ? status.duration : storedDurationSec

  const skip = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(duration, status.currentTime + delta))
      seekTo(next)
    },
    [duration, seekTo, status.currentTime]
  )

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % PLAYBACK_SPEEDS.length
    setSpeedIdx(next)
    applySpeed(PLAYBACK_SPEEDS[next])
  }, [applySpeed, speedIdx])

  return {
    playing: status.playing,
    currentTime: status.currentTime,
    duration,
    speed: PLAYBACK_SPEEDS[speedIdx],
    toggle,
    seekTo,
    skip,
    cycleSpeed,
  }
}
