// Tiny event bus for "re-tapped the active tab" → screen resets to default
// state (PWA behavior: home clears filters, settings scrolls to top).

export type TabName = 'index' | 'folders' | 'settings'

type Listener = () => void

const listeners = new Map<TabName, Set<Listener>>()

export function onTabReset(tab: TabName, cb: Listener): () => void {
  if (!listeners.has(tab)) listeners.set(tab, new Set())
  listeners.get(tab)!.add(cb)
  return () => {
    listeners.get(tab)?.delete(cb)
  }
}

export function emitTabReset(tab: TabName) {
  listeners.get(tab)?.forEach((cb) => cb())
}
