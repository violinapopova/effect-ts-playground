import { Data } from 'effect'

export type Step = 'geocode' | 'forecast' | 'air'

/** A real transport or HTTP failure. The only thing that turns a timeline row red. */
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly step: Step
  readonly reason: string
}> {}

export interface Place {
  readonly name: string
  readonly country: string
  readonly admin1?: string
  readonly latitude: number
  readonly longitude: number
}

export interface Reading {
  /** The place this forecast was fetched for. On the broken card it can disagree with the label. */
  readonly forPlace: Place
  readonly temperature: number
  readonly weatherCode: number
}

export interface AirReading {
  /** The place this air quality was fetched for. */
  readonly forPlace: Place
  readonly aqi: number
  readonly pm25: number
}

export interface City {
  readonly place: Place
  readonly reading: Reading
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, hail',
  99: 'Thunderstorm, hail',
}

export const describeWeather = (code: number): string => WEATHER_CODES[code] ?? 'Unknown'

/** The European AQI band name for a value. */
export const describeAqi = (aqi: number): string => {
  if (aqi <= 20) return 'Good'
  if (aqi <= 40) return 'Fair'
  if (aqi <= 60) return 'Moderate'
  if (aqi <= 80) return 'Poor'
  if (aqi <= 100) return 'Very poor'
  return 'Extremely poor'
}
