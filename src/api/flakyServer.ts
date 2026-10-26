import { NetworkError } from '@/domain/errors'
import { type Transport, wait } from './transport'

/** How many times the flaky server answers 503 for a city's forecast before it succeeds. */
export const FLAKY_FAILURES = 2

/** How long a 503 takes to come back, about as long as a real forecast. */
const FAILURE_LATENCY_MS = 180

let isOn = false
const forecastAttempts = new Map<string, number>()

/** Turns the flaky forecast server on or off, and forgets earlier attempts. */
export const setFlakyServer = (on: boolean): void => {
  isOn = on
  forecastAttempts.clear()
}

/**
 * Wraps a transport so that, while the flaky server is on, each place's forecast fails
 * FLAKY_FAILURES times before reaching it. Live and Offline stay unaware of it.
 */
export const withFlakyServer = (inner: Transport): Transport => ({
  async get(step, url, key, signal) {
    if (!isOn || step !== 'forecast') return inner.get(step, url, key, signal)
    const attempt = (forecastAttempts.get(key) ?? 0) + 1
    forecastAttempts.set(key, attempt)
    if (attempt <= FLAKY_FAILURES) {
      await wait(FAILURE_LATENCY_MS, signal)
      throw new NetworkError({ step, reason: 'HTTP 503' })
    }
    return inner.get(step, url, key, signal)
  },
})
