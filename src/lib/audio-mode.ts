import { setAudioModeAsync } from 'expo-audio'

// Central audio-mode switching. Playback mode is the app default (set at
// launch); recording mode flips allowsRecording on for the duration of a
// recording. Background playback stays enabled in both.

export async function setPlaybackAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    allowsRecording: false,
  }).catch(() => {})
}

export async function setRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    allowsRecording: true,
  }).catch(() => {})
}
