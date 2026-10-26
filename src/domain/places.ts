import type { Place } from './weather'

/** The shortest query that fires a request. */
export const MIN_CHARS = 2

/** True once the search text is long enough to fire a request. */
export const hasQuery = (name: string): boolean => name.trim().length >= MIN_CHARS

export const isSamePlace = (a: Place, b: Place): boolean => a.latitude === b.latitude && a.longitude === b.longitude

export const placeLabel = (place: Place): string => `${place.name}, ${place.country}`
