import type { Place } from '../domain'

/** The shortest query that fires a request. */
export const MIN_CHARS = 2

export const isSamePlace = (a: Place, b: Place): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude

export const placeLabel = (place: Place): string => `${place.name}, ${place.country}`
