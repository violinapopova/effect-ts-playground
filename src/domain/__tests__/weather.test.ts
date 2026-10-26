import { describe, expect, it } from 'vitest'
import { describeAqi, describeWeather, skyOf } from '@/domain/weather'

describe('describeWeather', () => {
  it('names known WMO codes', () => {
    expect(describeWeather(0)).toBe('Clear sky')
    expect(describeWeather(63)).toBe('Rain')
    expect(describeWeather(95)).toBe('Thunderstorm')
  })

  it('falls back for codes it does not know', () => {
    expect(describeWeather(7)).toBe('Unknown')
  })
})

describe('describeAqi', () => {
  it.each([
    [0, 'Good'],
    [20, 'Good'],
    [21, 'Fair'],
    [40, 'Fair'],
    [60, 'Moderate'],
    [80, 'Poor'],
    [100, 'Very poor'],
    [101, 'Extremely poor'],
  ])('reads %i as %s', (aqi, band) => {
    expect(describeAqi(aqi)).toBe(band)
  })
})

describe('skyOf', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'partly'],
    [3, 'cloudy'],
    [45, 'fog'],
    [61, 'rain'],
    [73, 'snow'],
    [85, 'snow'],
    [80, 'rain'],
    [95, 'storm'],
  ] as const)('maps code %i to %s', (code, sky) => {
    expect(skyOf(code)).toBe(sky)
  })
})
