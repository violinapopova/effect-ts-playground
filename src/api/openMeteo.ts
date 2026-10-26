import type { AirReading, Place, Reading } from '@/domain/weather'
import { currentBlock, firstPlace, numberField } from './decode'
import { withFlakyServer } from './flakyServer'
import { getNetworkMode } from './networkMode'
import { type Transport, transportFor } from './transport'

// The three Open-Meteo requests. They only know the URLs and the response shapes: which
// transport answers, and whether the flaky server sits in front of it, is decided per call.

const transport = (): Transport => withFlakyServer(transportFor(getNetworkMode()))

const coordKey = (place: Place) => `${place.latitude},${place.longitude}`

/** Hop 1. Resolves to the first match, or `null` when nothing matches. */
export async function geocode(name: string, signal?: AbortSignal): Promise<Place | null> {
  const query = name.trim().toLowerCase()
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`
  return firstPlace(await transport().get('geocode', url, query, signal))
}

/** Hop 2. Only ever called with a geocode hit. */
export async function forecast(place: Place, signal?: AbortSignal): Promise<Reading> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,weather_code&timezone=auto`
  const current = currentBlock(await transport().get('forecast', url, coordKey(place), signal), 'forecast')
  return {
    forPlace: place,
    temperature: numberField(current, 'temperature_2m', 'forecast'),
    weatherCode: numberField(current, 'weather_code', 'forecast'),
  }
}

/** Air quality for a geocode hit, from the Open-Meteo air quality API. */
export async function airQuality(place: Place, signal?: AbortSignal): Promise<AirReading> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=european_aqi,pm2_5&timezone=auto`
  const current = currentBlock(await transport().get('air', url, coordKey(place), signal), 'air')
  return {
    forPlace: place,
    aqi: numberField(current, 'european_aqi', 'air'),
    pm25: numberField(current, 'pm2_5', 'air'),
  }
}
