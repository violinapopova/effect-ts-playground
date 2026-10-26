import { beforeAll, describe, expect, it } from 'vitest'
import { setNetworkMode } from '@/api/networkMode'
import { airQuality, forecast, geocode } from '@/api/openMeteo'

// Runs against the offline recording, so it needs no network.
beforeAll(() => setNetworkMode('offline'))

describe('Open-Meteo requests, offline', () => {
  it('geocodes a city, ignoring case and spaces', async () => {
    const place = await geocode('  BeRn ')
    expect(place).toMatchObject({ name: 'Bern', country: 'Switzerland' })
  })

  it('returns null for a city that does not exist', async () => {
    expect(await geocode('atlantis')).toBeNull()
  })

  it('loads the forecast and air quality for that place', async () => {
    const place = await geocode('berlin')
    if (!place) throw new Error('expected Berlin in the recording')

    const reading = await forecast(place)
    expect(reading.forPlace).toBe(place)
    expect(typeof reading.temperature).toBe('number')
    expect(Number.isInteger(reading.weatherCode)).toBe(true)

    const air = await airQuality(place)
    expect(air.forPlace).toBe(place)
    expect(typeof air.aqi).toBe('number')
  })
})
