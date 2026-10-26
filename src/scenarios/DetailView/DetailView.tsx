import { useCallback, useEffect, useRef, useState } from 'react'
import { Effect, Exit } from 'effect'
import { type City, DEFAULT_CHAOS_MS, delay, describeWeather, forecast, geocode } from '@/api/weather'
import { type Track, trackPromise } from '@/lib/track'
import { useTimeline } from '@/hooks/useTimeline'
import { useToasts } from '@/hooks/useToasts'
import { hop, runLatest, tracked } from '@/lib/fx'
import { Card, Fact, Facts, type Impl, ImplSwitch, ScenarioLayout, type Status, Toasts, WeatherPanel } from '@/components'
import { placeLabel } from '@/domain/places'
import { ghost } from '@/styles/ui'
import { cityItem, cityList } from './styles'
import type { DetailView, DetailScreenProps, DetailCardProps, ListCardProps } from './props'

const CITIES = ['Berlin', 'Paris', 'London', 'Zurich'] as const

/** Each hop on the detail screen waits this long, so there is time to press Back. */
const DETAIL_DELAY_MS = DEFAULT_CHAOS_MS

// ---------------------------------------------------------------------------
// useEffect: the flag protects this screen's state. The toast and the list live above it.
// ---------------------------------------------------------------------------

function useDetailBroken(name: string, track: Track, onLoaded: (city: City) => void): DetailView {
  const [city, setCity] = useState<City | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    trackPromise(track, `geocode ${name}`, name, async () => {
      const hit = await geocode(name)
      await delay(DETAIL_DELAY_MS)
      return hit
    })
      .then(async (place) => {
        if (!place) throw new Error(`No match for ${name}`)
        const reading = await trackPromise(track, `forecast ${name}`, name, async () => {
          const result = await forecast(place)
          await delay(DETAIL_DELAY_MS)
          return result
        })
        const loaded: City = { place, reading }
        if (!cancelled) {
          setCity(loaded)
          setStatus('idle')
        }
        onLoaded(loaded)
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [name, track, onLoaded])

  return { city, status }
}

// ---------------------------------------------------------------------------
// Effect: unmounting the screen interrupts its fiber, so nothing reports back
// ---------------------------------------------------------------------------

const loadDetail = (name: string, track: Track) =>
  Effect.gen(function* () {
    const place = yield* tracked(track, `geocode ${name}`, name, hop('geocode', (signal) => geocode(name, signal), DETAIL_DELAY_MS))
    if (!place) return yield* Effect.die(new Error(`No match for ${name}`))
    const reading = yield* tracked(track, `forecast ${name}`, name, hop('forecast', (signal) => forecast(place, signal), DETAIL_DELAY_MS))
    const city: City = { place, reading }
    return city
  })

function useDetailEffect(name: string, track: Track, onLoaded: (city: City) => void): DetailView {
  const [city, setCity] = useState<City | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(
    () =>
      runLatest(loadDetail(name, track), (exit) => {
        if (Exit.isFailure(exit)) {
          setStatus('failed')
          return
        }
        setCity(exit.value)
        setStatus('idle')
        onLoaded(exit.value)
      }),
    [name, track, onLoaded],
  )

  return { city, status }
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function DetailCard({ impl, name, view, onBack }: DetailCardProps) {
  const { city, status } = view
  const back = (
    <button type="button" className={`${ghost} mb-3.5`} onClick={onBack}>
      ← Back to cities
    </button>
  )
  return (
    <Card impl={impl} title={name} status={status} action={back}>
      <WeatherPanel
        weatherCode={city?.reading.weatherCode ?? null}
        temperature={city?.reading.temperature ?? null}
        title={city?.place.name ?? 'Loading…'}
        subtitle={city ? describeWeather(city.reading.weatherCode) : 'Press Back before it loads'}
        isEmpty={!city}
        isLoading={status === 'loading'}
      />
      <Facts>
        <Fact label="Place">{city ? placeLabel(city.place) : '—'}</Fact>
        <Fact label="Coordinates">{city ? `${city.place.latitude.toFixed(2)}, ${city.place.longitude.toFixed(2)}` : '—'}</Fact>
      </Facts>
    </Card>
  )
}

function BrokenDetail(props: DetailScreenProps) {
  const view = useDetailBroken(props.name, props.track, props.onLoaded)
  return <DetailCard impl="useEffect" name={props.name} view={view} onBack={props.onBack} />
}

function EffectDetail(props: DetailScreenProps) {
  const view = useDetailEffect(props.name, props.track, props.onLoaded)
  return <DetailCard impl="Effect" name={props.name} view={view} onBack={props.onBack} />
}

function ListCard({ impl, onOpen, recent }: ListCardProps) {
  return (
    <Card impl={impl} title="Cities">
      <div className={cityList}>
        {CITIES.map((name) => (
          <button key={name} type="button" className={cityItem} aria-label={`Open ${name}`} onClick={() => onOpen(name)}>
            <span>{name}</span>
            <span aria-hidden>→</span>
          </button>
        ))}
      </div>
      <Facts>
        <Fact label="Recently viewed" isAlert={recent.length > 0 && impl === 'useEffect'}>
          {recent.length === 0 ? 'nothing yet' : recent.join(', ')}
        </Fact>
      </Facts>
    </Card>
  )
}

/** Leaving a screen while it loads: who still writes to the app after the screen is gone. */
export function DetailViewScenario() {
  const [impl, setImpl] = useState<Impl>('useEffect')
  const [open, setOpen] = useState<string | null>(null)
  const [recent, setRecent] = useState<ReadonlyArray<string>>([])
  const { toasts, show: showToast, clear: clearToasts } = useToasts()
  const { rows, track, clear } = useTimeline()
  // Which city is on screen, for onLoaded to compare against when a load finishes.
  const openRef = useRef<string | null>(null)
  useEffect(() => {
    openRef.current = open
  }, [open])

  const onLoaded = useCallback(
    (city: City) => {
      const isStale = openRef.current !== city.place.name
      showToast(isStale ? `${city.place.name} finished loading, but you already left it` : `${city.place.name} is ready`, isStale)
      setRecent((prev) => [city.place.name, ...prev.filter((n) => n !== city.place.name)].slice(0, 4))
    },
    [showToast],
  )

  const switchImpl = (next: Impl) => {
    setImpl(next)
    setOpen(null)
    setRecent([])
    clearToasts()
    clear()
  }
  const openCity = (name: string) => {
    clear()
    setOpen(name)
  }

  const Detail = impl === 'useEffect' ? BrokenDetail : EffectDetail
  return (
    <>
      <ScenarioLayout
        toolbar={<ImplSwitch value={impl} onChange={switchImpl} />}
        rows={rows}
        emptyText="Open a city, then go back before it loads."
      >
        {open ? (
          <Detail key={`${impl}-${open}`} name={open} track={track} onLoaded={onLoaded} onBack={() => setOpen(null)} />
        ) : (
          <ListCard impl={impl} onOpen={openCity} recent={recent} />
        )}
      </ScenarioLayout>
      <Toasts toasts={toasts} />
    </>
  )
}
