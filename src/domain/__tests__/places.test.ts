import { describe, expect, it } from 'vitest'
import { hasQuery, isSamePlace, placeLabel } from '@/domain/places'
import type { Place } from '@/domain/weather'

const bern: Place = { name: 'Bern', country: 'Switzerland', latitude: 46.95, longitude: 7.45 }
const berlin: Place = { name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.41 }

describe('hasQuery', () => {
  it('needs at least two characters, ignoring surrounding spaces', () => {
    expect(hasQuery('')).toBe(false)
    expect(hasQuery(' b ')).toBe(false)
    expect(hasQuery('be')).toBe(true)
    expect(hasQuery('  ber ')).toBe(true)
  })
})

describe('isSamePlace', () => {
  it('compares coordinates, not names', () => {
    expect(isSamePlace(bern, { ...bern, name: 'Berne' })).toBe(true)
    expect(isSamePlace(bern, berlin)).toBe(false)
  })
})

describe('placeLabel', () => {
  it('joins the name and the country', () => {
    expect(placeLabel(berlin)).toBe('Berlin, Germany')
  })
})
