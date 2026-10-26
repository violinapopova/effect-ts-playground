import { useEffect, useState } from 'react'
import { type City, type Place, type Reading, forecast, geocode, wifiDelay } from '@/api/weather'
import type { Track } from '@/lib/track'
import { Backdrop, Header, NetworkSwitch, ScenarioLayout, Segmented, type Status } from '@/components'
import { MIN_CHARS } from '@/domain/places'
import { usePreference } from '@/hooks/usePreference'
import { AirQualityScenario } from '@/scenarios/AirQuality/AirQuality'
import { FlakyRetryScenario } from '@/scenarios/FlakyRetry/FlakyRetry'
import { DetailViewScenario } from '@/scenarios/DetailView/DetailView'
import { CityCard } from '@/scenarios/SearchRace/CityCard'
import type { CityView } from '@/scenarios/SearchRace/props'
import { useCityAtom } from '@/scenarios/SearchRace/atomCity'
import { useScenarioSearch } from '@/hooks/useScenarioSearch'

const CHAOS_MS = 1200

// ===========================================================================
// USEEFFECT — the broken version. Looks correct. Isn't.
// ===========================================================================

import { delay } from '@/api/weather'

async function hop<A>(label: string, run: () => Promise<A>, track: Track): Promise<A> {
  const id = track.start(label)
  try {
    const value = await run()
    track.settle(id, 'landed')
    return value
  } catch (error) {
    track.settle(id, 'failed')
    throw error
  }
}

async function loadCity(name: string, chaosMs: number, track: Track): Promise<City | null> {
  const wait = wifiDelay(name, chaosMs)
  const place = await hop(
    `geocode ${name}`,
    async () => {
      const hit = await geocode(name)
      await delay(wait)
      return hit
    },
    track,
  )
  if (!place) return null
  const reading = await hop(
    `forecast ${name}`,
    async () => {
      const current = await forecast(place)
      await delay(wait)
      return current
    },
    track,
  )
  return { place, reading }
}

function useCity(name: string, chaosMs: number, track: Track): CityView {
  const [place, setPlace] = useState<Place | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (name.trim().length < MIN_CHARS) {
      setPlace(null)
      setReading(null)
      setStatus('idle')
      return
    }
    let cancelled = false
    setStatus('loading')
    loadCity(name, chaosMs, track)
      .then((city) => {
        if (!cancelled) setPlace(city?.place ?? null)
        setReading(city?.reading ?? null)
        setStatus('idle')
      })
      .catch(() => setStatus('failed'))
    return () => {
      cancelled = true
    }
  }, [name, chaosMs, track])

  return { impl: 'useEffect', place, reading, status }
}

// ===========================================================================
// EFFECT — uncomment this block and comment the useEffect above
// ===========================================================================

// import { Cause, Effect, Exit, Fiber } from 'effect'
// import { NetworkError, type Step } from '@/api/weather'
// import { type Settled } from '@/lib/track'

// const toNetworkError =
//   (step: Step) =>
//   (cause: unknown): NetworkError =>
//     cause instanceof NetworkError ? cause : new NetworkError({ step, reason: String(cause) })

// const rowStateOf = (exit: Exit.Exit<unknown, NetworkError>): Settled => {
//   if (Exit.isSuccess(exit)) return 'landed'
//   return Cause.hasInterruptsOnly(exit.cause) ? 'interrupted' : 'failed'
// }

// const tracked = <A,>(track: Track, label: string, self: Effect.Effect<A, NetworkError>) =>
//   Effect.suspend(() => {
//     const id = track.start(label)
//     return self.pipe(Effect.onExit((exit) => Effect.sync(() => track.settle(id, rowStateOf(exit)))))
//   })

// const loadCityEffect = (name: string, chaosMs: number, track: Track) =>
//   Effect.gen(function* () {
//     const wait = wifiDelay(name, chaosMs)

//     const place = yield* tracked(
//       track,
//       `geocode ${name}`,
//       Effect.gen(function* () {
//         const hit = yield* Effect.tryPromise({
//           try: (signal) => geocode(name, signal),
//           catch: toNetworkError('geocode'),
//         })
//         yield* Effect.sleep(wait)
//         return hit
//       }),
//     )
//     if (!place) return null

//     const reading = yield* tracked(
//       track,
//       `forecast ${name}`,
//       Effect.gen(function* () {
//         const current = yield* Effect.tryPromise({
//           try: (signal) => forecast(place, signal),
//           catch: toNetworkError('forecast'),
//         })
//         yield* Effect.sleep(wait)
//         return current
//       }),
//     )
//     const city: City = { place, reading }
//     return city
//   })

// function useCity(name: string, chaosMs: number, track: Track): CityView {
//   const [place, setPlace] = useState<Place | null>(null)
//   const [reading, setReading] = useState<Reading | null>(null)
//   const [status, setStatus] = useState<Status>('idle')

//   useEffect(() => {
//     if (name.trim().length < MIN_CHARS) {
//       setPlace(null)
//       setReading(null)
//       setStatus('idle')
//       return
//     }
//     setStatus('loading')
//     const program = Effect.runFork(
//       Effect.gen(function* () {
//         const fiber = yield* Effect.forkChild(loadCityEffect(name, chaosMs, track))
//         const exit = yield* Fiber.await(fiber)
//         if (Exit.isSuccess(exit)) {
//           setPlace(exit.value?.place ?? null)
//           setReading(exit.value?.reading ?? null)
//           setStatus('idle')
//           return
//         }
//         if (!Cause.hasInterruptsOnly(exit.cause)) setStatus('failed')
//       }),
//     )
//     return () => {
//       Effect.runFork(Fiber.interrupt(program))
//     }
//   }, [name, chaosMs, track])

//   return { impl: 'Effect', place, reading, status }
// }

// ---------------------------------------------------------------------------
// Search race: the hero demo with the live code swap
// ---------------------------------------------------------------------------

interface SourceProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly track: Track
}

interface HookCityProps extends SourceProps {
  /** Empties the timeline when the code swap changes which implementation is live. */
  readonly clear: () => void
}

/** The hook from the live code swap above: useEffect or Effect, whichever block is active. */
function HookCity({ name, onNameChange, track, clear }: HookCityProps) {
  const view = useCity(name, CHAOS_MS, track)
  useEffect(clear, [clear, view.impl])
  return <CityCard name={name} onNameChange={onNameChange} view={view} />
}

/** The same search read from an atom, which owns the fiber. */
function AtomCity({ name, onNameChange, track }: SourceProps) {
  return <CityCard name={name} onNameChange={onNameChange} view={useCityAtom(name, track)} />
}

type Source = 'hook' | 'atom'

const SOURCE_OPTIONS = [
  { value: 'hook', text: 'useCity hook' },
  { value: 'atom', text: 'Atom' },
] as const

function SearchRaceScenario() {
  const { variant: source, changeVariant: changeSource, name, changeName, rows, track, clear } = useScenarioSearch<Source>('hook')

  return (
    <ScenarioLayout
      toolbar={<Segmented<Source> label="Data source" options={SOURCE_OPTIONS} value={source} onChange={changeSource} />}
      rows={rows}
      emptyText="Type “ber”, then “n”, to watch the requests race."
    >
      {source === 'hook' ? (
        <HookCity key="hook" name={name} onNameChange={changeName} track={track} clear={clear} />
      ) : (
        <AtomCity key="atom" name={name} onNameChange={changeName} track={track} />
      )}
    </ScenarioLayout>
  )
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { value: 'search', text: 'Search race', Screen: SearchRaceScenario },
  { value: 'air', text: 'Air quality', Screen: AirQualityScenario },
  { value: 'retry', text: 'Flaky server', Screen: FlakyRetryScenario },
  { value: 'detail', text: 'Leave the screen', Screen: DetailViewScenario },
] as const

type Tab = (typeof SCENARIOS)[number]['value']

const isTab = (value: string | null): value is Tab => SCENARIOS.some((scenario) => scenario.value === value)

export function App() {
  const [tab, changeTab] = usePreference('skyswitch.tab', isTab, 'search')

  const Screen = SCENARIOS.find((scenario) => scenario.value === tab)?.Screen ?? SearchRaceScenario

  return (
    <div className="relative min-h-screen overflow-clip px-6 pt-12 pb-[72px] max-[560px]:pt-8">
      <Backdrop />
      <Header />

      <nav className="relative z-1 mx-auto mb-[22px] flex max-w-[1140px] flex-wrap items-center justify-between gap-x-5 gap-y-3.5" aria-label="Demo">
        <Segmented<Tab> label="Scenario" options={SCENARIOS} value={tab} onChange={changeTab} />
        <NetworkSwitch />
      </nav>

      <main className="relative z-1 mx-auto flex max-w-[1140px] flex-col gap-[22px]">
        <Screen />
      </main>
    </div>
  )
}
