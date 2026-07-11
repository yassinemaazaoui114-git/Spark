import { useEffect, useReducer } from 'react'

// Multi-select store (Step 26.7). Module-level like smart-folder: every
// RecordCard subscribes, the SelectionToolbar acts on the selected ids.
// Mounted cards register as "visible" so Select-all knows the current list.

type Meta = { archived: boolean }
type Listener = () => void

let active = false
const selected = new Map<string, Meta>()
const visible = new Map<string, Meta>()
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((cb) => cb())
}

export const selection = {
  isActive: () => active,
  count: () => selected.size,
  ids: () => [...selected.keys()],
  isSelected: (id: string) => selected.has(id),
  /** True when every selected record is archived (toolbar shows Unarchive) */
  allArchived: () =>
    selected.size > 0 && [...selected.values()].every((m) => m.archived),

  start(id: string, meta: Meta) {
    active = true
    selected.clear()
    selected.set(id, meta)
    emit()
  },
  toggle(id: string, meta: Meta) {
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.set(id, meta)
    }
    emit()
  },
  selectAll() {
    visible.forEach((meta, id) => selected.set(id, meta))
    emit()
  },
  exit() {
    active = false
    selected.clear()
    emit()
  },

  registerVisible(id: string, meta: Meta) {
    visible.set(id, meta)
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
