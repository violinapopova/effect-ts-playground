import { readPreference, writePreference } from '@/lib/preferences'

export type NetworkMode = 'live' | 'offline'

const MODE_KEY = 'skyswitch.network'

let mode: NetworkMode = readPreference(MODE_KEY) === 'offline' ? 'offline' : 'live'

const listeners = new Set<() => void>()

/** Live API or the offline recording. Remembered in the browser. */
export const getNetworkMode = (): NetworkMode => mode

export const subscribeNetworkMode = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const setNetworkMode = (next: NetworkMode): void => {
  mode = next
  writePreference(MODE_KEY, next)
  listeners.forEach((listener) => listener())
}
