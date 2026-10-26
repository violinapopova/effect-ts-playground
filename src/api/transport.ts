import fixtures from './fixtures.json'
import { NetworkError, type Step } from '@/domain/errors'
import type { NetworkMode } from './networkMode'

/** Anything that can answer a hop: the live API, the offline recording, or a wrapper around either. */
export interface Transport {
  get(step: Step, url: string, key: string, signal?: AbortSignal): Promise<unknown>
}

/** How long each recorded hop takes offline, close to the live API's own latency. */
const OFFLINE_LATENCY: Record<Step, number> = { geocode: 220, forecast: 180, air: 200 }

/** When the offline responses were recorded. */
export const recordedAt: string = fixtures.recordedAt

const FIXTURES: Record<Step, Record<string, unknown>> = {
  geocode: fixtures.geocode,
  forecast: fixtures.forecast,
  air: fixtures.air,
}

const abortError = () => new DOMException('The request was aborted', 'AbortError')

/** True for the error a fetch throws when its AbortSignal fires. */
export const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError'

/** Waits `ms`, or rejects with an AbortError as soon as `signal` fires. */
export const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })

const offlineTransport: Transport = {
  async get(step, _url, key, signal) {
    await wait(OFFLINE_LATENCY[step], signal)
    const body = FIXTURES[step][key]
    if (body === undefined && step !== 'geocode') {
      throw new NetworkError({ step, reason: 'Not in the offline recording' })
    }
    return body ?? {}
  },
}

const liveTransport: Transport = {
  async get(step, url, _key, signal) {
    let res: Response
    try {
      res = await fetch(url, { signal })
    } catch (cause) {
      if (isAbortError(cause)) throw cause
      throw new NetworkError({ step, reason: String(cause) })
    }
    if (!res.ok) throw new NetworkError({ step, reason: `HTTP ${res.status}` })
    return res.json() as Promise<unknown>
  },
}

const TRANSPORTS: Record<NetworkMode, Transport> = { live: liveTransport, offline: offlineTransport }

export const transportFor = (mode: NetworkMode): Transport => TRANSPORTS[mode]
