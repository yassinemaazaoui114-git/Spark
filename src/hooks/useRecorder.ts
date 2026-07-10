import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  type AudioRecorder,
} from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

import { setPlaybackAudioMode, setRecordingAudioMode } from '@/lib/audio-mode'
import { deleteRecordingFile } from '@/storage/files'

// Recording state machine — port of the PWA's MediaRecorder logic onto
// expo-audio. The timer counts only while actively recording (not paused),
// matching the PWA behavior.

export type RecorderPhase = 'idle' | 'recording' | 'paused'

export type FinishedRecording = {
  uri: string // temp file — persistRecording() moves it on save (Step 9)
  durationSec: number
  createdAt: number
}

export type Recorder = {
  phase: RecorderPhase
  seconds: number
  start: () => Promise<boolean> // false = permission denied / failed
  pause: () => void
  resume: () => void
  stop: () => Promise<FinishedRecording | null>
  cancel: () => Promise<void>
  /** Underlying expo-audio recorder — Step 8 reads metering from it */
  audioRecorder: AudioRecorder
}

export function useRecorder(): Recorder {
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  })

  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [seconds, setSeconds] = useState(0)
  const secondsRef = useRef(0)
  const startTsRef = useRef(0)

  useEffect(() => {
    secondsRef.current = seconds
  }, [seconds])

  // Tick only while recording — pausing freezes the counter automatically.
  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) return false
      await setRecordingAudioMode()
      await audioRecorder.prepareToRecordAsync()
      audioRecorder.record()
      startTsRef.current = Date.now()
      setSeconds(0)
      setPhase('recording')
      return true
    } catch {
      return false
    }
  }, [audioRecorder])

  const pause = useCallback(() => {
    if (phase !== 'recording') return
    audioRecorder.pause()
    setPhase('paused')
  }, [audioRecorder, phase])

  const resume = useCallback(() => {
    if (phase !== 'paused') return
    audioRecorder.record()
    setPhase('recording')
  }, [audioRecorder, phase])

  // Stop and hand back the temp file. Returns null if nothing was captured.
  const stop = useCallback(async (): Promise<FinishedRecording | null> => {
    try {
      await audioRecorder.stop()
    } catch {
      setPhase('idle')
      return null
    }
    await setPlaybackAudioMode()
    setPhase('idle')
    const uri = audioRecorder.uri
    if (!uri) return null
    return {
      uri,
      durationSec: secondsRef.current,
      createdAt: startTsRef.current || Date.now(),
    }
  }, [audioRecorder])

  // Discard: stop and delete the temp file.
  const cancel = useCallback(async () => {
    try {
      await audioRecorder.stop()
    } catch {
      // already stopped
    }
    await setPlaybackAudioMode()
    if (audioRecorder.uri) {
      deleteRecordingFile(audioRecorder.uri)
    }
    setPhase('idle')
    setSeconds(0)
  }, [audioRecorder])

  return { phase, seconds, start, pause, resume, stop, cancel, audioRecorder }
}
