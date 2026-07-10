// Singleton playback coordinator — port of the PWA's media-session.ts core
// rule: only one record plays at a time. Starting a new one pauses the
// previous. Lock-screen metadata joins in Step 13.

type ActivePlayback = {
  recordId: string
  pause: () => void
}

let active: ActivePlayback | null = null

// Call right before play(). Pauses whatever else was playing.
export function registerActive(recordId: string, pause: () => void) {
  if (active && active.recordId !== recordId) {
    try {
      active.pause()
    } catch {
      // previous player already released
    }
  }
  active = { recordId, pause }
}

// Call on unmount so a stale pause callback is never invoked.
export function clearActive(recordId: string) {
  if (active?.recordId === recordId) {
    active = null
  }
}
