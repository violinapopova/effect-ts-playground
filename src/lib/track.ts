import { isAbortError } from '@/api/transport'

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
