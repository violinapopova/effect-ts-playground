import fixtures from './fixtures.json'
import { type AirReading, NetworkError, type Place, type Reading, type Step } from './domain'
import { readPreference, writePreference } from './preferences'

export type NetworkMode = 'live' | 'offline'

const MODE_KEY = 'skyswitch.network'

/** How long each recorded hop takes offline, close to the live API's own latency. */
const OFFLINE_LATENCY: Record<Step, number> = { geocode: 220, forecast: 180, air: 200 }

/** How many times the flaky server answers 503 for a city's forecast before it succeeds. */
export const FLAKY_FAILURES = 2

/** When the offline responses were recorded. */
export const recordedAt: string = fixtures.recordedAt

interface Session {
  mode: NetworkMode
  flaky: boolean
  forecastAttempts: Map<string, number>
}

const session: Session = {
  mode: readPreference(MODE_KEY) === 'offline' ? 'offline' : 'live',
  flaky: false,
  forecastAttempts: new Map(),
}

const modeListeners = new Set<() => void>()

export const getNetworkMode = (): NetworkMode => session.mode

export const subscribeNetworkMode = (listener: () => void): (() => void) => {
  modeListeners.add(listener)
  return () => modeListeners.delete(listener)
}

export const setNetworkMode = (mode: NetworkMode): void => {
  session.mode = mode
  writePreference(MODE_KEY, mode)
  modeListeners.forEach((listener) => listener())
}

/** Turns the flaky forecast server on or off, and forgets earlier attempts. */
export const setFlakyServer = (on: boolean): void => {
  session.flaky = on
  session.forecastAttempts.clear()
}

const abortError = () => new DOMException('The request was aborted', 'AbortError')

/** True for the error a fetch throws when its AbortSignal fires. */
export const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError'

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
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

/** Anything that can answer a hop: the live API or the offline recording. */
interface Transport {
  get(step: Step, url: string, key: string, signal?: AbortSignal): Promise<unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const fixtureTable = (step: Step): Record<string, unknown> => {
  const table = step === 'geocode' ? fixtures.geocode : step === 'forecast' ? fixtures.forecast : fixtures.air
  return table
}

const offlineTransport: Transport = {
  async get(step, _url, key, signal) {
    await wait(OFFLINE_LATENCY[step], signal)
    const body = fixtureTable(step)[key]
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

const activeTransport = (): Transport => (session.mode === 'offline' ? offlineTransport : liveTransport)

/**
 * The flaky server fails the first FLAKY_FAILURES forecast attempts, then delegates.
 * Checked at call time so Live and Offline stay unaware of it.
 */
const throughFlakyForecast = async (key: string, signal: AbortSignal | undefined, load: () => Promise<unknown>): Promise<unknown> => {
  if (!session.flaky) return load()
  const attempt = (session.forecastAttempts.get(key) ?? 0) + 1
  session.forecastAttempts.set(key, attempt)
  if (attempt <= FLAKY_FAILURES) {
    await wait(OFFLINE_LATENCY.forecast, signal)
    throw new NetworkError({ step: 'forecast', reason: 'HTTP 503' })
  }
  return load()
}

const coordKey = (place: Place) => `${place.latitude},${place.longitude}`

const numberField = (record: Record<string, unknown>, field: string, step: Step): number => {
  const value = record[field]
  if (typeof value !== 'number') throw new NetworkError({ step, reason: `Missing ${field}` })
  return value
}

const readPlace = (value: unknown): Place | null => {
  if (!isRecord(value)) return null
  const { name, country, admin1, latitude, longitude } = value
  if (typeof name !== 'string' || typeof country !== 'string') return null
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return { name, country, admin1: typeof admin1 === 'string' ? admin1 : undefined, latitude, longitude }
}

/** Hop 1. Resolves to `results[0]`, or `null` when nothing matches. */
export async function geocode(name: string, signal?: AbortSignal): Promise<Place | null> {
  const query = name.trim().toLowerCase()
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5`
  const body = await activeTransport().get('geocode', url, query, signal)
  if (!isRecord(body) || !Array.isArray(body.results)) return null
  return readPlace(body.results[0])
}

/** Hop 2. Only ever called with a geocode hit. */
export async function forecast(place: Place, signal?: AbortSignal): Promise<Reading> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,weather_code&timezone=auto`
  const key = coordKey(place)
  const body = await throughFlakyForecast(key, signal, () => activeTransport().get('forecast', url, key, signal))
  if (!isRecord(body) || !isRecord(body.current)) throw new NetworkError({ step: 'forecast', reason: 'Unexpected forecast body' })
  return {
    forPlace: place,
    temperature: numberField(body.current, 'temperature_2m', 'forecast'),
    weatherCode: numberField(body.current, 'weather_code', 'forecast'),
  }
}

/** Air quality for a geocode hit, from the Open-Meteo air quality API. */
export async function airQuality(place: Place, signal?: AbortSignal): Promise<AirReading> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=european_aqi,pm2_5&timezone=auto`
  const key = coordKey(place)
  const body = await activeTransport().get('air', url, key, signal)
  if (!isRecord(body) || !isRecord(body.current)) throw new NetworkError({ step: 'air', reason: 'Unexpected air quality body' })
  return {
    forPlace: place,
    aqi: numberField(body.current, 'european_aqi', 'air'),
    pm25: numberField(body.current, 'pm2_5', 'air'),
  }
}
