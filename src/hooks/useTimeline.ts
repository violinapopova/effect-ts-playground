import { useCallback, useMemo, useState } from 'react'
import type { Row, Track } from '@/lib/track'

/** Holds the request rows of one screen, and a stable `track` and `clear` to change them. */
export function useTimeline() {
  const [rows, setRows] = useState<ReadonlyArray<Row>>([])

  const track = useMemo<Track>(() => {
    return {
      start: (label, query) => {
        const id = crypto.randomUUID()
        setRows((prev) => [...prev, { id, label, query, startedAt: Date.now(), state: 'running' }])
        return id
      },
      settle: (id, state) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, state, endedAt: Date.now() } : row)))
      },
    }
  }, [])

  const clear = useCallback(() => setRows([]), [])

  return { rows, track, clear }
}
