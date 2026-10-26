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
} from '@/api/weather'
import { type Track, trackPromise } from '@/lib/track'
import { hop, runLatest, tracked } from '@/lib/fx'
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
import { hasQuery, isSamePlace, placeLabel } from '@/domain/places'
import { useScenarioSearch } from '@/hooks/useScenarioSearch'
import type { AirView, AirCardProps, AirScreenProps } from './props'

/** The air quality API is the slow one in this scenario, so there is time to change city mid-load. */
const AIR_EXTRA_MS = 1500

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
    if (!hasQuery(name)) {
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
    if (!hasQuery(name)) {
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

function AirCard({ impl, name, onNameChange, view }: AirCardProps) {
  const { place, reading, air, status } = view
  const isReadingStale = !!reading && (!place || !isSamePlace(place, reading.forPlace))
  const isAirStale = !!air && (!place || !isSamePlace(place, air.forPlace))

  return (
    <Card impl={impl} title="Air quality" status={status} isStale={isReadingStale || isAirStale}>
      <SearchInput value={name} onChange={onNameChange} />

      <WeatherPanel
        weatherCode={reading?.weatherCode ?? null}
        temperature={reading?.temperature ?? null}
        title={place?.name ?? 'Somewhere'}
        subtitle={place ? place.country : 'Type a city to begin'}
        isEmpty={!place}
        isLoading={status === 'loading'}
        isTemperatureAlert={isReadingStale && !!place}
      >
        <Metric value={air ? air.aqi : '--'} label={air ? `AQI · ${describeAqi(air.aqi)}` : 'AQI'} isAlert={isAirStale} />
      </WeatherPanel>

      <Facts>
        <Fact label="Forecast for" isAlert={isReadingStale}>
          {reading ? `${placeLabel(reading.forPlace)} · ${describeWeather(reading.weatherCode)}` : '—'}
        </Fact>
        <Fact label="Air quality for" isAlert={isAirStale}>
          {air ? placeLabel(air.forPlace) : '—'}
        </Fact>
      </Facts>
    </Card>
  )
}

function BrokenAir({ name, onNameChange, track }: AirScreenProps) {
  return <AirCard impl="useEffect" name={name} onNameChange={onNameChange} view={useAirBroken(name, track)} />
}

function EffectAir({ name, onNameChange, track }: AirScreenProps) {
  return <AirCard impl="Effect" name={name} onNameChange={onNameChange} view={useAirEffect(name, track)} />
}

/** Fan-out: forecast and air quality in parallel, and what happens when the city changes mid-load. */
export function AirQualityScenario() {
  const { variant: impl, changeVariant: switchImpl, name, changeName, rows, track } = useScenarioSearch<Impl>('useEffect')

  const Screen = impl === 'useEffect' ? BrokenAir : EffectAir
  return (
    <ScenarioLayout
      toolbar={<ImplSwitch value={impl} onChange={switchImpl} />}
      rows={rows}
      emptyText="Type a city. Forecast and air quality load in parallel."
    >
      <Screen key={impl} name={name} onNameChange={changeName} track={track} />
    </ScenarioLayout>
  )
}
