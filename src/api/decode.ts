import { NetworkError, type Step } from '@/domain/errors'
import type { Place } from '@/domain/weather'

// Reads untyped JSON bodies into domain values. A malformed body is a NetworkError for its step.

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const numberField = (record: Record<string, unknown>, field: string, step: Step): number => {
  const value = record[field]
  if (typeof value !== 'number') throw new NetworkError({ step, reason: `Missing ${field}` })
  return value
}

/** The `current` block of a forecast or air quality body. */
export const currentBlock = (body: unknown, step: Step): Record<string, unknown> => {
  if (!isRecord(body) || !isRecord(body.current)) throw new NetworkError({ step, reason: `Unexpected ${step} body` })
  return body.current
}

/** The first geocoding result, or `null` when nothing matches. */
export const firstPlace = (body: unknown): Place | null => {
  if (!isRecord(body) || !Array.isArray(body.results)) return null
  const value: unknown = body.results[0]
  if (!isRecord(value)) return null
  const { name, country, admin1, latitude, longitude } = value
  if (typeof name !== 'string' || typeof country !== 'string') return null
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return { name, country, admin1: typeof admin1 === 'string' ? admin1 : undefined, latitude, longitude }
}
