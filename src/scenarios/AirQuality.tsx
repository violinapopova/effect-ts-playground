import { useEffect, useState } from 'react'
import { Effect, Exit } from 'effect'
import {
  type AirReading,
  type Place,
  type Reading,
  DEFAULT_CHAOS_MS,
  airQuality,
  delay,
  describeAqi,
  describeWeather,
  forecast,
  geocode,
  wifiDelay,
} from '../weather'
import { Timeline, type Track, trackPromise, useTimeline } from '../timeline'
import { hop, runLatest, tracked } from '../fx'
import {
  Fact,
  type Impl,
  ImplSwitch,
  MIN_CHARS,
  SearchInput,
  type Status,
  StatusPill,
  WeatherIcon,
  isSamePlace,
  placeLabel,
} from '../components'
import {
  aqi,
  aqiLabel,
  aqiValue,
  cardClass,
  cardHead,
  cardRibbon,
  cardTitle,
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
} from '../ui'

/** The air quality API is the slow one in this scenario, so there is time to change city mid-load. */
const AIR_EXTRA_MS = 1500

interface AirView {
  readonly place: Place | null
  readonly reading: Reading | null
  readonly air: AirReading | null
  readonly status: Status
}

function useAirState() {
  const [place, setPlace] = useState<Place | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [air, setAir] = useState<AirReading | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const reset = () => {
    setPlace(null)
    setReading(null)
    setAir(null)
    setStatus('idle')
  }
  return { view: { place, reading, air, status }, setPlace, setReading, setAir, setStatus, reset }
}

// ---------------------------------------------------------------------------
// useEffect: the AbortController reaches the forecast. Nobody passed it to air quality.
// ---------------------------------------------------------------------------

function useAirBroken(name: string, track: Track): AirView {
  const { view, setPlace, setReading, setAir, setStatus, reset } = useAirState()

  useEffect(() => {
    if (name.trim().length < MIN_CHARS) {
      reset()
      return
    }
    const controller = new AbortController()
    const waitMs = wifiDelay(name, DEFAULT_CHAOS_MS)
    setStatus('loading')

    trackPromise(track, `geocode ${name}`, name, async () => {
      const hit = await geocode(name)
      await delay(waitMs)
      return hit
    })
      .then((place) => {
        if (!place) {
          if (!controller.signal.aborted) reset()
          return
        }
        if (!controller.signal.aborted) setPlace(place)

        trackPromise(track, `forecast ${name}`, name, async () => {
          const reading = await forecast(place, controller.signal)
          await delay(waitMs)
          return reading
        })
          .then((reading) => {
            setReading(reading)
            setStatus('idle')
          })
          .catch(() => {})

        trackPromise(track, `air ${name}`, name, async () => {
          const air = await airQuality(place)
          await delay(waitMs + AIR_EXTRA_MS)
          return air
        }).then(setAir)
      })
      .catch(() => setStatus('failed'))

    return () => controller.abort()
  }, [name, track])

  return view
}

// ---------------------------------------------------------------------------
// Effect: both requests live in one fiber, and Effect.all stops them as a pair
// ---------------------------------------------------------------------------

const loadAir = (name: string, track: Track) =>
  Effect.gen(function* () {
    const waitMs = wifiDelay(name, DEFAULT_CHAOS_MS)
    const place = yield* tracked(track, `geocode ${name}`, name, hop('geocode', (signal) => geocode(name, signal), waitMs))
    if (!place) return null

    const { reading, air } = yield* Effect.all(
      {
        reading: tracked(track, `forecast ${name}`, name, hop('forecast', (signal) => forecast(place, signal), waitMs)),
        air: tracked(track, `air ${name}`, name, hop('air', (signal) => airQuality(place, signal), waitMs + AIR_EXTRA_MS)),
      },
      { concurrency: 'unbounded' },
    )
    return { place, reading, air }
  })

function useAirEffect(name: string, track: Track): AirView {
  const { view, setPlace, setReading, setAir, setStatus, reset } = useAirState()

  useEffect(() => {
    if (name.trim().length < MIN_CHARS) {
      reset()
      return
    }
    setStatus('loading')
    return runLatest(loadAir(name, track), (exit) => {
      if (Exit.isFailure(exit)) {
        setStatus('failed')
        return
      }
      setPlace(exit.value?.place ?? null)
      setReading(exit.value?.reading ?? null)
      setAir(exit.value?.air ?? null)
      setStatus('idle')
    })
  }, [name, track])

  return view
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

function AirCard({ impl, name, onNameChange, view }: { readonly impl: Impl; readonly name: string; readonly onNameChange: (n: string) => void; readonly view: AirView }) {
  const { place, reading, air, status } = view
  const isReadingStale = !!reading && (!place || !isSamePlace(place, reading.forPlace))
  const isAirStale = !!air && (!place || !isSamePlace(place, air.forPlace))
  const isStale = isReadingStale || isAirStale

  return (
    <section className={`${cardClass(impl, isStale)} ${scenarioCard}`}>
      {isStale && <div className={cardRibbon}>stale data</div>}
      <header className={cardHead(isStale)}>
        <h2 className={cardTitle(impl)}>Air quality</h2>
        <StatusPill status={status} />
      </header>

      <SearchInput value={name} onChange={onNameChange} />

      <div className={weatherClass(!place, status === 'loading')}>
        <WeatherIcon code={reading?.weatherCode ?? null} />
        <div className={weatherMain}>
          <div className={weatherTemp(isReadingStale && !!place)} data-temp data-dim>
            {reading ? reading.temperature.toFixed(1) : '--'}
            <span className={weatherUnit}>°C</span>
          </div>
          <div className={weatherCity} data-dim>{place?.name ?? 'Somewhere'}</div>
          <div className={weatherCountry}>{place ? place.country : 'Type a city to begin'}</div>
        </div>
        <div className={aqi(isAirStale)}>
          <span className={aqiValue(isAirStale)}>{air ? air.aqi : '--'}</span>
          <span className={aqiLabel}>{air ? `AQI · ${describeAqi(air.aqi)}` : 'AQI'}</span>
        </div>
      </div>

      <dl className={facts}>
        <Fact label="Forecast for" isAlert={isReadingStale}>
          {reading ? `${placeLabel(reading.forPlace)} · ${describeWeather(reading.weatherCode)}` : '—'}
        </Fact>
        <Fact label="Air quality for" isAlert={isAirStale}>
          {air ? placeLabel(air.forPlace) : '—'}
        </Fact>
      </dl>
    </section>
  )
}

function BrokenAir(props: { name: string; onNameChange: (n: string) => void; track: Track }) {
  return <AirCard impl="useEffect" name={props.name} onNameChange={props.onNameChange} view={useAirBroken(props.name, props.track)} />
}

function EffectAir(props: { name: string; onNameChange: (n: string) => void; track: Track }) {
  return <AirCard impl="Effect" name={props.name} onNameChange={props.onNameChange} view={useAirEffect(props.name, props.track)} />
}

/** Fan-out: forecast and air quality in parallel, and what happens when the city changes mid-load. */
export function AirQualityScenario() {
  const [impl, setImpl] = useState<Impl>('useEffect')
  const [name, setName] = useState('')
  const { rows, track, clear } = useTimeline()

  const switchImpl = (next: Impl) => {
    setImpl(next)
    setName('')
    clear()
  }
  const changeName = (next: string) => {
    if (next.trim().length < MIN_CHARS) clear()
    setName(next)
  }

  const Card = impl === 'useEffect' ? BrokenAir : EffectAir
  return (
    <div className={scenario()}>
      <div className={scenarioBar}>
        <ImplSwitch value={impl} onChange={switchImpl} />
      </div>
      <Card key={impl} name={name} onNameChange={changeName} track={track} />
      <div className={scenarioTimeline}>
        <Timeline rows={rows} emptyText="Type a city. Forecast and air quality load in parallel." />
      </div>
    </div>
  )
}
