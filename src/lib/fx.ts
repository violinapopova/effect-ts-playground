import { Cause, Effect, Exit, Fiber } from 'effect'
import { NetworkError, type Step } from '@/domain/errors'
import type { Settled, Track } from './track'

export const toNetworkError =
  (step: Step) =>
  (cause: unknown): NetworkError =>
    cause instanceof NetworkError ? cause : new NetworkError({ step, reason: String(cause) })

/** One request as an Effect. Interrupting it aborts the underlying fetch. */
export const request = <A>(step: Step, run: (signal: AbortSignal) => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: toNetworkError(step) })

/** A request followed by the conference-wifi delay, the same shape as the hero demo's hops. */
export const hop = <A>(step: Step, run: (signal: AbortSignal) => Promise<A>, waitMs: number) =>
  Effect.gen(function* () {
    const value = yield* request(step, run)
    yield* Effect.sleep(waitMs)
    return value
  })

const rowStateOf = (exit: Exit.Exit<unknown, NetworkError>): Settled => {
  if (Exit.isSuccess(exit)) return 'landed'
  return Cause.hasInterruptsOnly(exit.cause) ? 'interrupted' : 'failed'
}

/** Records an Effect as a timeline row: landed, failed, or interrupted. */
export const tracked = <A>(track: Track, label: string, query: string, self: Effect.Effect<A, NetworkError>) =>
  Effect.suspend(() => {
    const id = track.start(label, query)
    return self.pipe(Effect.onExit((exit) => Effect.sync(() => track.settle(id, rowStateOf(exit)))))
  })

/**
 * Runs `work` as a child fiber and hands its exit to `onDone`, unless the fiber was only
 * interrupted. Returns the cleanup for useEffect: interrupting the parent interrupts the child.
 */
export function runLatest<A, E>(work: Effect.Effect<A, E>, onDone: (exit: Exit.Exit<A, E>) => void): () => void {
  const program = Effect.runFork(
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(work)
      const exit = yield* Fiber.await(fiber)
      if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) return
      onDone(exit)
    }),
  )
  return () => {
    Effect.runFork(Fiber.interrupt(program))
  }
}
