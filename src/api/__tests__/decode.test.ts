import { describe, expect, it } from 'vitest'
import { NetworkError } from '@/domain/errors'
import { currentBlock, firstPlace, numberField } from '@/api/decode'

describe('firstPlace', () => {
  it('reads the first geocoding result', () => {
    const body = {
      results: [
        { name: 'Bern', country: 'Switzerland', admin1: 'Bern', latitude: 46.95, longitude: 7.45 },
        { name: 'Bernau', country: 'Germany', latitude: 52.67, longitude: 13.58 },
      ],
    }
    expect(firstPlace(body)).toEqual({
      name: 'Bern',
      country: 'Switzerland',
      admin1: 'Bern',
      latitude: 46.95,
      longitude: 7.45,
    })
  })

  it('returns null when nothing matched', () => {
    expect(firstPlace({})).toBeNull()
    expect(firstPlace({ results: [] })).toBeNull()
  })

  it('returns null for a malformed result', () => {
    expect(
      firstPlace({ results: [{ name: 'Bern', country: 'Switzerland', latitude: '46.95', longitude: 7.45 }] }),
    ).toBeNull()
    expect(firstPlace('not json')).toBeNull()
  })

  it('drops a non-string region', () => {
    const body = { results: [{ name: 'Bern', country: 'Switzerland', admin1: 42, latitude: 1, longitude: 2 }] }
    expect(firstPlace(body)?.admin1).toBeUndefined()
  })
})

describe('currentBlock', () => {
  it('returns the `current` object', () => {
    expect(currentBlock({ current: { temperature_2m: 12 } }, 'forecast')).toEqual({ temperature_2m: 12 })
  })

  it('throws a NetworkError for the step when the body has no `current` object', () => {
    expect(() => currentBlock({}, 'air')).toThrow(NetworkError)
    expect(() => currentBlock({ current: 3 }, 'forecast')).toThrow(expect.objectContaining({ step: 'forecast' }))
  })
})

describe('numberField', () => {
  it('reads a number', () => {
    expect(numberField({ aqi: 18 }, 'aqi', 'air')).toBe(18)
  })

  it('throws a NetworkError when the field is missing or not a number', () => {
    expect(() => numberField({}, 'aqi', 'air')).toThrow(NetworkError)
    expect(() => numberField({ aqi: '18' }, 'aqi', 'air')).toThrow(
      expect.objectContaining({ step: 'air', reason: 'Missing aqi' }),
    )
  })
})
