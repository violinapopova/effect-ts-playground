import { useNow } from '@/hooks/useNow'
import type { RowState } from '@/lib/track'
import type { TimelineProps } from './props'
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
} from './styles'

const STATE_GLYPH: Record<RowState, string> = {
  running: '●',
  landed: '✓',
  interrupted: '✕',
  failed: '!',
}

/** Every request of the screen as a bar: running, landed, interrupted, or failed. */
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
