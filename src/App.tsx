import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  type City,
  type Place,
  type Reading,
  type NetworkMode,
  describeWeather,
  forecast,
  geocode,
  getNetworkMode,
  recordedAt,
  setNetworkMode,
  subscribeNetworkMode,
  wifiDelay,
} from './weather'
import { Timeline, type Track, useTimeline } from './timeline'
import { CLOUD, MIN_CHARS, Segmented, SearchInput, type Status, StatusPill, WeatherIcon, isSamePlace } from './components'
import {
  cardClass,
  cardHead,
  cardRibbon,
  cardTitle,
  factClass,
  factLabel,
  factValue,
  facts,
  scenario,
  scenarioBar,
  scenarioCard,
  scenarioTimeline,
  weatherCity,
  weatherClass,
  weatherCountry,
  weatherMain,
  weatherTemp,
  weatherUnit,
} from './ui'
import { readPreference, writePreference } from './preferences'
import { AirQualityScenario } from './scenarios/AirQuality'
import { FlakyRetryScenario } from './scenarios/FlakyRetry'
import { DetailViewScenario } from './scenarios/DetailView'
import { useCityAtom } from './scenarios/atomCity'

interface CityView {
  readonly impl: 'useEffect' | 'Effect' | 'Atom'
  readonly place: Place | null
  readonly reading: Reading | null
  readonly status: Status
}

const CHAOS_MS = 1200

// ===========================================================================
// USEEFFECT — the broken version. Looks correct. Isn't.
// Comment out everything down to the EFFECT banner when you go live.
// ===========================================================================

// import { delay } from './weather'

// async function hop<A>(label: string, run: () => Promise<A>, track: Track): Promise<A> {
//   const id = track.start(label)
//   try {
//     const value = await run()
//     track.settle(id, 'landed')
//     return value
//   } catch (error) {
//     track.settle(id, 'failed')
//     throw error
//   }
// }

// async function loadCity(name: string, chaosMs: number, track: Track): Promise<City | null> {
//   const wait = wifiDelay(name, chaosMs)
//   const place = await hop(
//     `geocode ${name}`,
//     async () => {
//       const hit = await geocode(name)
//       await delay(wait)
//       return hit
//     },
//     track,
//   )
//   if (!place) return null
//   const reading = await hop(
//     `forecast ${name}`,
//     async () => {
//       const current = await forecast(place)
//       await delay(wait)
//       return current
//     },
//     track,
//   )
//   return { place, reading }
// }

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
//     let cancelled = false
//     setStatus('loading')
//     loadCity(name, chaosMs, track)
//       .then((city) => {
//         if (!cancelled) setPlace(city?.place ?? null)
//         setReading(city?.reading ?? null)
//         setStatus('idle')
//       })
//       .catch(() => setStatus('failed'))
//     return () => {
//       cancelled = true
//     }
//   }, [name, chaosMs, track])

//   return { impl: 'useEffect', place, reading, status }
// }

// ===========================================================================
// EFFECT — uncomment this block and comment the useEffect above
// ===========================================================================

import { Cause, Effect, Exit, Fiber } from 'effect'
import { NetworkError, type Step } from './weather'
import { type Settled } from './timeline'

const toNetworkError =
  (step: Step) =>
  (cause: unknown): NetworkError =>
    cause instanceof NetworkError ? cause : new NetworkError({ step, reason: String(cause) })

const rowStateOf = (exit: Exit.Exit<unknown, NetworkError>): Settled => {
  if (Exit.isSuccess(exit)) return 'landed'
  return Cause.hasInterruptsOnly(exit.cause) ? 'interrupted' : 'failed'
}

const tracked = <A,>(track: Track, label: string, self: Effect.Effect<A, NetworkError>) =>
  Effect.suspend(() => {
    const id = track.start(label)
    return self.pipe(Effect.onExit((exit) => Effect.sync(() => track.settle(id, rowStateOf(exit)))))
  })

const loadCityEffect = (name: string, chaosMs: number, track: Track) =>
  Effect.gen(function* () {
    const wait = wifiDelay(name, chaosMs)

    const place = yield* tracked(
      track,
      `geocode ${name}`,
      Effect.gen(function* () {
        const hit = yield* Effect.tryPromise({
          try: (signal) => geocode(name, signal),
          catch: toNetworkError('geocode'),
        })
        yield* Effect.sleep(wait)
        return hit
      }),
    )
    if (!place) return null

    const reading = yield* tracked(
      track,
      `forecast ${name}`,
      Effect.gen(function* () {
        const current = yield* Effect.tryPromise({
          try: (signal) => forecast(place, signal),
          catch: toNetworkError('forecast'),
        })
        yield* Effect.sleep(wait)
        return current
      }),
    )
    const city: City = { place, reading }
    return city
  })

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
    setStatus('loading')
    const program = Effect.runFork(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(loadCityEffect(name, chaosMs, track))
        const exit = yield* Fiber.await(fiber)
        if (Exit.isSuccess(exit)) {
          setPlace(exit.value?.place ?? null)
          setReading(exit.value?.reading ?? null)
          setStatus('idle')
          return
        }
        if (!Cause.hasInterruptsOnly(exit.cause)) setStatus('failed')
      }),
    )
    return () => {
      Effect.runFork(Fiber.interrupt(program))
    }
  }, [name, chaosMs, track])

  return { impl: 'Effect', place, reading, status }
}

// ---------------------------------------------------------------------------
// Search race: the hero demo with the live code swap
// ---------------------------------------------------------------------------

interface CardProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly view: CityView
}

function CityCard({ name, onNameChange, view }: CardProps) {
  const { impl, place, reading, status } = view
  const hasQuery = name.trim().length >= MIN_CHARS
  const isMismatch = !!place && !!reading && !isSamePlace(place, reading.forPlace)
  const isEmpty = !place && !reading
  const cityLabel = place?.name ?? (hasQuery && status === 'idle' ? 'No match' : 'Somewhere')

  return (
    <section className={`${cardClass(impl, isMismatch)} ${scenarioCard}`}>
      {isMismatch && <div className={cardRibbon}>stale data</div>}
      <header className={cardHead(isMismatch)}>
        <h2 className={cardTitle(impl)}>{impl}</h2>
        <StatusPill status={status} />
      </header>

      <SearchInput value={name} onChange={onNameChange} />

      <div className={weatherClass(isEmpty, status === 'loading')}>
        <WeatherIcon code={reading?.weatherCode ?? null} />
        <div className={weatherMain}>
          <div className={weatherTemp(isMismatch && !isEmpty)} data-temp data-dim>
            {reading ? reading.temperature.toFixed(1) : '--'}
            <span className={weatherUnit}>°C</span>
          </div>
          <div className={weatherCity} data-dim>{cityLabel}</div>
          <div className={weatherCountry}>
            {place ? [place.admin1, place.country].filter(Boolean).join(', ') : 'Type a city to begin'}
          </div>
        </div>
      </div>

      <dl className={facts}>
        <div className={factClass()}>
          <dt className={factLabel()}>Weather code</dt>
          <dd className={factValue}>{reading ? `${reading.weatherCode} · ${describeWeather(reading.weatherCode)}` : '—'}</dd>
        </div>
        <div className={factClass(isMismatch)}>
          <dt className={factLabel(isMismatch)}>Forecast for</dt>
          <dd className={factValue}>{reading ? `${reading.forPlace.name}, ${reading.forPlace.country}` : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

interface SourceProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly track: Track
  readonly clear: () => void
}

/** The hook from the live code swap above: useEffect or Effect, whichever block is active. */
function HookCity({ name, onNameChange, track, clear }: SourceProps) {
  const view = useCity(name, CHAOS_MS, track)
  useEffect(clear, [view.impl])
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
  const [source, setSource] = useState<Source>('hook')
  const [name, setName] = useState('')
  const timeline = useTimeline()
  const { clear } = timeline

  const changeSource = (next: Source) => {
    setSource(next)
    setName('')
    clear()
  }
  const changeName = (next: string) => {
    if (next.trim().length < MIN_CHARS) clear()
    setName(next)
  }

  const City = source === 'hook' ? HookCity : AtomCity
  return (
    <div className={scenario()}>
      <div className={scenarioBar}>
        <Segmented<Source> label="Data source" options={SOURCE_OPTIONS} value={source} onChange={changeSource} />
      </div>
      <City key={source} name={name} onNameChange={changeName} track={timeline.track} clear={clear} />
      <div className={scenarioTimeline}>
        <Timeline rows={timeline.rows} emptyText="Type “ber”, then “n”, to watch the requests race." />
      </div>
    </div>
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

const TAB_KEY = 'skyswitch.tab'

const isTab = (value: string | null): value is Tab => SCENARIOS.some((scenario) => scenario.value === value)

const readTab = (): Tab => {
  const saved = readPreference(TAB_KEY)
  return isTab(saved) ? saved : 'search'
}

const NETWORK_OPTIONS = [
  { value: 'live', text: 'Live API' },
  { value: 'offline', text: 'Offline' },
] as const

function NetworkSwitch() {
  const mode = useSyncExternalStore(subscribeNetworkMode, getNetworkMode)
  const recorded = new Date(recordedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return (
    <div className="flex flex-col items-end gap-1.5 max-[560px]:items-start">
      <Segmented<NetworkMode> label="Network" options={NETWORK_OPTIONS} value={mode} onChange={setNetworkMode} />
      <span className="text-xs text-cream/40">
        {mode === 'offline' ? `Recorded responses from ${recorded}, same timings` : 'Real requests to Open-Meteo'}
      </span>
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>(readTab)

  const changeTab = (next: Tab) => {
    setTab(next)
    writePreference(TAB_KEY, next)
  }

  const Screen = SCENARIOS.find((scenario) => scenario.value === tab)?.Screen ?? SearchRaceScenario

  return (
    <div className="relative min-h-screen overflow-clip px-6 pt-12 pb-[72px] max-[560px]:pt-8">
      <div className="pointer-events-none absolute top-[120px] left-[calc(50%-460px)] z-0 size-[460px] animate-drift rounded-full bg-teal/55 blur-[90px]" aria-hidden />
      <div className="pointer-events-none absolute top-[380px] left-[calc(50%+60px)] z-0 size-[400px] animate-drift rounded-full bg-coral/45 blur-[90px] [animation-delay:-9s]" aria-hidden />

      <header className="relative z-1 mx-auto mb-10 flex items-center justify-center gap-[18px]">
        <svg className="size-[60px] shrink-0 drop-shadow-[0_6px_18px_rgb(0_0_0/0.4)]" viewBox="0 0 64 64" aria-hidden>
          <circle className="fill-coral" cx="40" cy="22" r="12" />
          <path className="fill-cream" d={CLOUD} />
        </svg>
        <div>
          <h1 className="m-0 text-[clamp(36px,5vw,54px)] leading-none font-extrabold tracking-[-0.035em]">
            Sky<span className="text-coral">Switch</span>
          </h1>
          <p className="mt-2 text-[clamp(15px,1.8vw,19px)] text-cream/60">An Effect playground for async races</p>
        </div>
      </header>

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
