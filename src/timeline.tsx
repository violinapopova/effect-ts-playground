import { useEffect, useMemo, useState } from 'react'
import { isAbortError } from './transport'
import {
  timeline,
  timelineBar,
  timelineEmpty,
  timelineHead,
  timelineLabel,
  timelineList,
  timelineOffset,
  timelineRow,
  timelineSpan,
  timelineState,
  timelineTrack,
} from './ui'

export type RowState = 'running' | 'landed' | 'interrupted' | 'failed'
export type Settled = Exclude<RowState, 'running'>

export interface Row {
  readonly id: string
  readonly label: string
  /** The search text this request was made for. */
  readonly query?: string
  readonly startedAt: number
  readonly endedAt?: number
  readonly state: RowState
}

export interface Track {
  readonly start: (label: string, query?: string) => string
  readonly settle: (id: string, state: Settled) => void
}

/** Holds the request rows of one screen and a stable `track` to record them. */
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

  return { rows, track, clear: () => setRows([]) }
}

/** Runs one promise-based request and records it as a timeline row. An aborted request counts as interrupted. */
export async function trackPromise<A>(track: Track, label: string, query: string, run: () => Promise<A>): Promise<A> {
  const id = track.start(label, query)
  try {
    const value = await run()
    track.settle(id, 'landed')
    return value
  } catch (error) {
    track.settle(id, isAbortError(error) ? 'interrupted' : 'failed')
    throw error
  }
}

function useNow(isTicking: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isTicking) return
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [isTicking])
  return now
}

const STATE_GLYPH: Record<RowState, string> = {
  running: '●',
  landed: '✓',
  interrupted: '✕',
  failed: '!',
}

interface TimelineProps {
  readonly rows: ReadonlyArray<Row>
  readonly emptyText: string
}

export function Timeline({ rows, emptyText }: TimelineProps) {
  const isTicking = rows.some((row) => row.state === 'running')
  const now = useNow(isTicking)
  const origin = rows[0]?.startedAt ?? now
  const end = Math.max(...rows.map((row) => row.endedAt ?? now), origin + 1000)
  const span = end - origin
  const pct = (ms: number) => `${(ms / span) * 100}%`

  return (
    <section className={timeline}>
      <header className={timelineHead}>
        <span>Request timeline</span>
        {rows.length > 0 && <span className={timelineSpan}>{(span / 1000).toFixed(1)} s</span>}
      </header>
      {rows.length === 0 ? (
        <div className={timelineEmpty}>{emptyText}</div>
      ) : (
        <ol className={timelineList}>
          {rows.map((row) => {
            const duration = (row.endedAt ?? now) - row.startedAt
            return (
              <li key={row.id} className={timelineRow}>
                <span className={timelineLabel(row.state === 'interrupted')}>{row.label}</span>
                <span className={timelineTrack}>
                  <span
                    className={timelineBar(row.state)}
                    style={{ left: pct(row.startedAt - origin), width: pct(Math.max(duration, span * 0.01)) }}
                  />
                </span>
                <span className={timelineOffset}>+{row.startedAt - origin} ms</span>
                <span className={timelineState(row.state)}>
                  <span aria-hidden>{STATE_GLYPH[row.state]}</span> {row.state}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
