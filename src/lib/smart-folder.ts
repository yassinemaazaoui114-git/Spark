// Cross-tab smart-folder selection — Settings picks a view (All / This week /
// This month / Archive), the home tab renders it. Mirrors the PWA's
// setSmartFolder + setActiveTab('home') flow.

export type SmartFolder = 'all' | 'week' | 'month' | 'archive'

type Listener = (value: SmartFolder | null) => void

let current: SmartFolder | null = null
const listeners = new Set<Listener>()

export function setSmartFolder(value: SmartFolder | null) {
  current = value
  listeners.forEach((cb) => cb(value))
}

export function getSmartFolder(): SmartFolder | null {
  return current
}

export function onSmartFolderChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
