import Constants, { ExecutionEnvironment } from 'expo-constants'
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

import { clearActive, registerActive } from '@/lib/playback-manager'

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

export function usePlayer(
  recordId: string,
  uri: string,
  storedDurationSec: number,
  meta?: PlayerMeta
): Player {
  const playerRef = useRef<AudioPlayer | null>(null)
  const statusSubRef = useRef<{ remove: () => void } | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [nativeDuration, setNativeDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(1) // default 1×

  // Create the native player on first use and subscribe to its status.
  const ensurePlayer = useCallback((): AudioPlayer => {
    if (!playerRef.current) {
      const player = createAudioPlayer(uri)
      statusSubRef.current = player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          setPlaying(status.playing)
          setCurrentTime(status.currentTime)
          if (status.duration > 0) setNativeDuration(status.duration)
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

  const duration = nativeDuration > 0 ? nativeDuration : storedDurationSec

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
    // Restart from the top when the last run finished
    if (nativeDuration > 0 && currentTime >= nativeDuration - 0.1) {
      await player.seekTo(0)
    }
    applySpeed(player, PLAYBACK_SPEEDS[speedIdx])
    player.play()
  }, [currentTime, ensurePlayer, meta?.folderName, meta?.title, nativeDuration, playing, recordId, speedIdx])

  const seekTo = useCallback(
    (sec: number) => {
      const player = ensurePlayer()
      player.seekTo(Math.max(0, sec))
      setCurrentTime(Math.max(0, sec))
    },
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
