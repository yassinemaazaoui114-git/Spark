import { useEffect, useReducer } from 'react'

// Multi-select store (Step 26.7). Module-level like smart-folder: every
// RecordCard subscribes, the SelectionToolbar acts on the selected ids.
// Cards on the FOCUSED screen register as "visible" so Select-all only grabs
// the list the user is looking at (tab screens stay mounted in the
// background, so a plain mount-based registry would leak rows across tabs).
// Archive/restore state is looked up live from the records by the toolbar —
// never snapshotted here, so it can't go stale.

type Listener = () => void

let active = false
const selected = new Set<string>()
const visible = new Set<string>()
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((cb) => cb())
}

export const selection = {
  isActive: () => active,
  count: () => selected.size,
  ids: () => [...selected],
  isSelected: (id: string) => selected.has(id),

  start(id: string) {
    active = true
    selected.clear()
    selected.add(id)
    emit()
  },
  toggle(id: string) {
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.add(id)
    }
    emit()
  },
  selectAll() {
    visible.forEach((id) => selected.add(id))
    emit()
  },
  exit() {
    active = false
    selected.clear()
    emit()
  },

  registerVisible(id: string) {
    visible.add(id)
  },
  unregisterVisible(id: string) {
    visible.delete(id)
  },
}

// Re-renders the caller on any selection change.
export function useSelection() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return selection
}
