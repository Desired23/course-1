import { useCallback, useRef, useState } from "react"

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

const MAX_HISTORY = 50
const COALESCE_WINDOW_MS = 600

/**
 * Generic undo/redo state container.
 *
 * `set` records a new history entry. Pass `{ coalesce: true }` for rapid edits
 * (e.g. typing in a text field) so a burst collapses into a single undo step.
 * `reset` replaces the value and clears history (used on load / restore).
 */
export function useHistoryState<T>(initial: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  })
  const lastCoalesceAt = useRef(0)

  const set = useCallback((next: T | ((prev: T) => T), opts?: { coalesce?: boolean }) => {
    setHistory((curr) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(curr.present) : next
      if (Object.is(resolved, curr.present)) return curr

      const now = Date.now()
      const coalesce = Boolean(opts?.coalesce) && now - lastCoalesceAt.current < COALESCE_WINDOW_MS
      lastCoalesceAt.current = opts?.coalesce ? now : 0

      if (coalesce) {
        // Replace the present value without pushing a new history checkpoint.
        return { past: curr.past, present: resolved, future: [] }
      }

      const past = [...curr.past, curr.present]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, present: resolved, future: [] }
    })
  }, [])

  const reset = useCallback((next: T) => {
    lastCoalesceAt.current = 0
    setHistory({ past: [], present: next, future: [] })
  }, [])

  const undo = useCallback(() => {
    lastCoalesceAt.current = 0
    setHistory((curr) => {
      if (curr.past.length === 0) return curr
      const previous = curr.past[curr.past.length - 1]
      return {
        past: curr.past.slice(0, -1),
        present: previous,
        future: [curr.present, ...curr.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    lastCoalesceAt.current = 0
    setHistory((curr) => {
      if (curr.future.length === 0) return curr
      const next = curr.future[0]
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: curr.future.slice(1),
      }
    })
  }, [])

  return {
    state: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
