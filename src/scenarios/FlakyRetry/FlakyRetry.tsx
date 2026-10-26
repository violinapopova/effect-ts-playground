import { useEffect, useState } from 'react'
import { Effect, Exit, Schedule } from 'effect'
import {
  type City,
  DEFAULT_CHAOS_MS,
  delay,
  describeWeather,
  forecast,
  geocode,
  setFlakyServer,
  wifiDelay,
} from '@/api/weather'
import { type Row, type Track, trackPromise } from '@/lib/track'
import { hop, request, runLatest, tracked } from '@/lib/fx'
import {
  Card,
  Fact,
  Facts,
  type Impl,
  ImplSwitch,
  Metric,
  ScenarioLayout,
  SearchInput,
  type Status,
  WeatherPanel,
} from '@/components'
import { hasQuery, placeLabel } from '@/domain/places'
import { ghost } from '@/styles/ui'
import { useScenarioSearch } from '@/hooks/useScenarioSearch'
import type { RetryView, RetryCardProps, RetryScreenProps } from './props'

/** Retries after the first try; three attempts in total. */
const RETRIES = 2
const BACKOFF_MS = 400

// ---------------------------------------------------------------------------
// useEffect: a hand-rolled retry loop. The flag guards the write, not the loop.
// ---------------------------------------------------------------------------

async function retry<A>(run: (attempt: number) => Promise<A>): Promise<A> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run(attempt)
    } catch (error) {
      if (attempt > RETRIES) throw error
      await delay(BACKOFF_MS * 2 ** (attempt - 1))
    }
  }
}

function useRetryBroken(name: string, track: Track): RetryView {
  const [city, setCity] = useState<City | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!hasQuery(name)) {
      setCity(null)
      setStatus('idle')
      return
    }
    let cancelled = false
    const waitMs = wifiDelay(name, DEFAULT_CHAOS_MS)
    setStatus('loading')

    trackPromise(track, `geocode ${name}`, name, async () => {
      const hit = await geocode(name)
      await delay(waitMs)
      return hit
    })
      .then(async (place) => {
        if (!place) return null
        const reading = await retry((attempt) =>
          trackPromise(track, `forecast ${name} · try ${attempt}`, name, () => forecast(place)),
        )
        return { place, reading }
      })
      .then((next) => {
        if (cancelled) return
        setCity(next)
        setStatus('idle')
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [name, track])

  return { city, status }
}

// ---------------------------------------------------------------------------
// Effect: the retry policy is a Schedule inside the fiber, so it dies with it
// ---------------------------------------------------------------------------

const loadWithRetry = (name: string, track: Track) =>
  Effect.gen(function* () {
    const waitMs = wifiDelay(name, DEFAULT_CHAOS_MS)
    const place = yield* tracked(track, `geocode ${name}`, name, hop('geocode', (signal) => geocode(name, signal), waitMs))
    if (!place) return null

    let attempt = 0
    const reading = yield* Effect.suspend(() => {
      attempt += 1
      return tracked(track, `forecast ${name} · try ${attempt}`, name, request('forecast', (signal) => forecast(place, signal)))
    }).pipe(
      Effect.retry({
        schedule: Schedule.exponential(BACKOFF_MS).pipe(Schedule.jittered),
        times: RETRIES,
      }),
    )
    const city: City = { place, reading }
    return city
  })

function useRetryEffect(name: string, track: Track): RetryView {
  const [city, setCity] = useState<City | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!hasQuery(name)) {
      setCity(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    return runLatest(loadWithRetry(name, track), (exit) => {
      if (Exit.isFailure(exit)) {
        setStatus('failed')
        return
      }
      setCity(exit.value)
      setStatus('idle')
    })
  }, [name, track])

  return { city, status }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/** Forecast requests made for a search the user had already replaced. */
const staleForecasts = (rows: ReadonlyArray<Row>, name: string) =>
  rows.filter((row) => row.label.startsWith('forecast') && row.query !== name).length

function RetryCard({ impl, name, onNameChange, view, wasted }: RetryCardProps) {
  const { city, status } = view
  return (
    <Card impl={impl} title="Flaky server" status={status}>
      <SearchInput value={name} onChange={onNameChange} />

      <WeatherPanel
        weatherCode={city?.reading.weatherCode ?? null}
        temperature={city?.reading.temperature ?? null}
        title={city?.place.name ?? 'Somewhere'}
        subtitle={city ? describeWeather(city.reading.weatherCode) : 'Type a city to begin'}
        isEmpty={!city}
        isLoading={status === 'loading'}
      >
        <Metric value={wasted} label="wasted requests" isAlert={wasted > 0} />
      </WeatherPanel>

      <Facts>
        <Fact label="Forecast for">{city ? placeLabel(city.place) : '—'}</Fact>
        <Fact label="Retries for searches you left" isAlert={wasted > 0}>
          {wasted === 0 ? 'none' : `${wasted} forecast ${wasted === 1 ? 'request' : 'requests'}`}
        </Fact>
      </Facts>
    </Card>
  )
}

function BrokenRetry(props: RetryScreenProps) {
  return <RetryCard impl="useEffect" {...props} view={useRetryBroken(props.name, props.track)} />
}

function EffectRetry(props: RetryScreenProps) {
  return <RetryCard impl="Effect" {...props} view={useRetryEffect(props.name, props.track)} />
}

const resetFlakyServer = () => setFlakyServer(true)

/** Retries that outlive the search: a hand-rolled loop against a Schedule inside the fiber. */
export function FlakyRetryScenario() {
  const {
    variant: impl,
    changeVariant: switchImpl,
    name,
    changeName,
    restart,
    rows,
    track,
  } = useScenarioSearch<Impl>('useEffect', resetFlakyServer)

  useEffect(() => {
    setFlakyServer(true)
    return () => setFlakyServer(false)
  }, [])

  const Screen = impl === 'useEffect' ? BrokenRetry : EffectRetry
  return (
    <ScenarioLayout
      toolbar={
        <>
          <ImplSwitch value={impl} onChange={switchImpl} />
          <button type="button" className={ghost} onClick={restart}>
            Reset server
          </button>
        </>
      }
      rows={rows}
      emptyText="Type a city. Each forecast fails twice before it works."
    >
      <Screen key={impl} name={name} onNameChange={changeName} track={track} wasted={staleForecasts(rows, name)} />
    </ScenarioLayout>
  )
}
