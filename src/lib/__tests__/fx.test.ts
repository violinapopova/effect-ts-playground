import { Effect, Exit, Fiber } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { NetworkError } from '@/domain/errors'
import { request, runLatest, tracked } from '@/lib/fx'
import type { Settled, Track } from '@/lib/track'

/** A Track that records how each row settled, and can wait for it. */
const recordingTrack = () => {
  const settled = new Map<string, Settled>()
  const started: Array<string> = []
  let next = 0
  const waiters = new Set<() => void>()
  const track: Track = {
    start: () => {
      const id = `row-${++next}`
      started.push(id)
      return id
    },
    settle: (id, state) => {
      settled.set(id, state)
      waiters.forEach((wake) => wake())
    },
  }
  const settledAs = (id: string) =>
    new Promise<Settled>((resolve) => {
      const check = () => {
        const state = settled.get(id)
        if (state) resolve(state)
      }
      waiters.add(check)
      check()
    })
  return { track, started, settledAs }
}

describe('tracked', () => {
  it('records a success as landed', async () => {
    const { track, settledAs } = recordingTrack()
    await Effect.runPromise(tracked(track, 'geocode ber', 'ber', Effect.succeed('Berlin')))
    expect(await settledAs('row-1')).toBe('landed')
  })

  it('records a NetworkError as failed', async () => {
    const { track, settledAs } = recordingTrack()
    const failing = Effect.fail(new NetworkError({ step: 'forecast', reason: 'HTTP 503' }))
    const exit = await Effect.runPromiseExit(tracked(track, 'forecast ber', 'ber', failing))
    expect(Exit.isFailure(exit)).toBe(true)
    expect(await settledAs('row-1')).toBe('failed')
  })

  it('records an interrupt as interrupted, not failed', async () => {
    const { track, settledAs } = recordingTrack()
    const fiber = Effect.runFork(tracked(track, 'geocode ber', 'ber', Effect.never))
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(await settledAs('row-1')).toBe('interrupted')
  })
})

describe('request', () => {
  it('aborts the underlying fetch when interrupted', async () => {
    let signal: AbortSignal | undefined
    const fiber = Effect.runFork(
      request('geocode', (s) => {
        signal = s
        return new Promise(() => {})
      }),
    )
    await vi.waitFor(() => expect(signal).toBeDefined())
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(signal?.aborted).toBe(true)
  })

  it('turns a rejection into a NetworkError for its step', async () => {
    const error = await Effect.runPromise(Effect.flip(request('air', () => Promise.reject(new Error('offline')))))
    expect(error).toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ step: 'air', reason: 'Error: offline' })
  })
})

describe('runLatest', () => {
  it('hands a finished result to onDone', async () => {
    const done = new Promise<Exit.Exit<string>>((resolve) => runLatest(Effect.succeed('Bern'), resolve))
    const exit = await done
    expect(Exit.isSuccess(exit) && exit.value).toBe('Bern')
  })

  it('interrupts the work on cleanup and never calls onDone', async () => {
    const { track, started, settledAs } = recordingTrack()
    const onDone = vi.fn<(exit: Exit.Exit<never, NetworkError>) => void>()
    const cleanup = runLatest(tracked(track, 'geocode ber', 'ber', Effect.never), onDone)
    // As in the app, the request is under way before the effect cleans up.
    await vi.waitFor(() => expect(started).toContain('row-1'))

    cleanup()

    expect(await settledAs('row-1')).toBe('interrupted')
    expect(onDone).not.toHaveBeenCalled()
  })
})
