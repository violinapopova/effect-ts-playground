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
} from '../weather'
import { type Row, Timeline, type Track, trackPromise, useTimeline } from '../timeline'
import { hop, request, runLatest, tracked } from '../fx'
import {
  Fact,
  type Impl,
  ImplSwitch,
  MIN_CHARS,
  SearchInput,
  type Status,
  StatusPill,
  WeatherIcon,
  placeLabel,
} from '../components'
import {
  aqi,
  aqiLabel,
  aqiValue,
  cardClass,
  cardHead,
  cardTitle,
  facts,
  ghost,
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
} from '../ui'

/** Retries after the first try; three attempts in total. */
const RETRIES = 2
const BACKOFF_MS = 400

interface RetryView {
  readonly city: City | null
  readonly status: Status
}

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
    if (name.trim().length < MIN_CHARS) {
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
    if (name.trim().length < MIN_CHARS) {
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

function RetryCard({ impl, name, onNameChange, view, wasted }: { impl: Impl; name: string; onNameChange: (n: string) => void; view: RetryView; wasted: number }) {
  const { city, status } = view
  return (
    <section className={`${cardClass(impl)} ${scenarioCard}`}>
      <header className={cardHead()}>
        <h2 className={cardTitle(impl)}>Flaky server</h2>
        <StatusPill status={status} />
      </header>

      <SearchInput value={name} onChange={onNameChange} />

      <div className={weatherClass(!city, status === 'loading')}>
        <WeatherIcon code={city?.reading.weatherCode ?? null} />
        <div className={weatherMain}>
          <div className={weatherTemp()} data-temp data-dim>
            {city ? city.reading.temperature.toFixed(1) : '--'}
            <span className={weatherUnit}>°C</span>
          </div>
          <div className={weatherCity} data-dim>{city?.place.name ?? 'Somewhere'}</div>
          <div className={weatherCountry}>{city ? describeWeather(city.reading.weatherCode) : 'Type a city to begin'}</div>
        </div>
        <div className={aqi(wasted > 0)}>
          <span className={aqiValue(wasted > 0)}>{wasted}</span>
          <span className={aqiLabel}>wasted requests</span>
        </div>
      </div>

      <dl className={facts}>
        <Fact label="Forecast for">{city ? placeLabel(city.place) : '—'}</Fact>
        <Fact label="Retries for searches you left" isAlert={wasted > 0}>
          {wasted === 0 ? 'none' : `${wasted} forecast ${wasted === 1 ? 'request' : 'requests'}`}
        </Fact>
      </dl>
    </section>
  )
}

function BrokenRetry(props: { name: string; onNameChange: (n: string) => void; track: Track; wasted: number }) {
  return <RetryCard impl="useEffect" {...props} view={useRetryBroken(props.name, props.track)} />
}

function EffectRetry(props: { name: string; onNameChange: (n: string) => void; track: Track; wasted: number }) {
  return <RetryCard impl="Effect" {...props} view={useRetryEffect(props.name, props.track)} />
}

/** Retries that outlive the search: a hand-rolled loop against a Schedule inside the fiber. */
export function FlakyRetryScenario() {
  const [impl, setImpl] = useState<Impl>('useEffect')
  const [name, setName] = useState('')
  const { rows, track, clear } = useTimeline()

  useEffect(() => {
    setFlakyServer(true)
    return () => setFlakyServer(false)
  }, [])

  const restart = () => {
    setFlakyServer(true)
    setName('')
    clear()
  }
  const switchImpl = (next: Impl) => {
    setImpl(next)
    restart()
  }
  const changeName = (next: string) => {
    if (next.trim().length < MIN_CHARS) {
      setFlakyServer(true)
      clear()
    }
    setName(next)
  }

  const Card = impl === 'useEffect' ? BrokenRetry : EffectRetry
  return (
    <div className={scenario()}>
      <div className={scenarioBar}>
        <ImplSwitch value={impl} onChange={switchImpl} />
        <button type="button" className={ghost} onClick={restart}>
          Reset server
        </button>
      </div>
      <Card key={impl} name={name} onNameChange={changeName} track={track} wasted={staleForecasts(rows, name)} />
      <div className={scenarioTimeline}>
        <Timeline rows={rows} emptyText="Type a city. Each forecast fails twice before it works." />
      </div>
    </div>
  )
}
