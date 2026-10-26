import { useEffect } from 'react'
import { Effect } from 'effect'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'
import { useAtomValue } from '@effect/atom-react'
import { type City, type Place, type Reading, DEFAULT_CHAOS_MS, forecast, geocode, wifiDelay } from '@/api/weather'
import type { Track } from '@/lib/track'
import { hop, tracked } from '@/lib/fx'
import { type Status } from '@/components'
import { hasQuery } from '@/domain/places'

// ---------------------------------------------------------------------------
// ATOM — the atom owns the fiber. No useEffect, no cleanup.
// ---------------------------------------------------------------------------

/** Where the atom's requests are recorded. The Search race tab points it at its own timeline. */
let liveTrack: Track | null = null
const rowIds = new Map<string, string>()

/**
 * The atom starts its work while React renders `useAtomValue`, so row updates are deferred
 * until that render is done. Microtasks run in order, so a row always starts before it settles.
 */
const atomTrack: Track = {
  start: (label, query) => {
    const id = crypto.randomUUID()
    queueMicrotask(() => {
      const rowId = liveTrack?.start(label, query)
      if (rowId) rowIds.set(id, rowId)
    })
    return id
  },
  settle: (id, state) => {
    queueMicrotask(() => {
      const rowId = rowIds.get(id)
      rowIds.delete(id)
      if (rowId) liveTrack?.settle(rowId, state)
    })
  },
}

const loadCity = (name: string) =>
  Effect.gen(function* () {
    if (!hasQuery(name)) return null
    const waitMs = wifiDelay(name, DEFAULT_CHAOS_MS)
    const place = yield* tracked(atomTrack, `geocode ${name}`, name, hop('geocode', (signal) => geocode(name, signal), waitMs))
    if (!place) return null
    const reading = yield* tracked(atomTrack, `forecast ${name}`, name, hop('forecast', (signal) => forecast(place, signal), waitMs))
    const city: City = { place, reading }
    return city
  })

/**
 * One atom per search term. When no component reads it any more, the registry disposes it
 * and interrupts its fiber. `setIdleTTL(0)` makes that happen straight away instead of after
 * the default 400 ms grace period.
 */
export const cityAtom = Atom.family((name: string) => Atom.make(loadCity(name)).pipe(Atom.setIdleTTL(0)))

export interface AtomCityView {
  readonly impl: 'Atom'
  readonly place: Place | null
  readonly reading: Reading | null
  readonly status: Status
}

/** Reads the city for `name` from its atom, and records the atom's requests on `track`. */
export function useCityAtom(name: string, track: Track): AtomCityView {
  useEffect(() => {
    liveTrack = track
    return () => {
      liveTrack = null
    }
  }, [track])

  const result = useAtomValue(cityAtom(name))
  const city = AsyncResult.isSuccess(result) ? result.value : null
  let status: Status = 'idle'
  if (AsyncResult.isFailure(result)) status = 'failed'
  else if (AsyncResult.isInitial(result) || result.waiting) status = 'loading'

  return {
    impl: 'Atom',
    place: city?.place ?? null,
    reading: city?.reading ?? null,
    status: hasQuery(name) ? status : 'idle',
  }
}
