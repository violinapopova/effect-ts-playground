import { useCallback, useEffect, useRef, useState } from 'react'
import { Effect, Exit } from 'effect'
import { type City, DEFAULT_CHAOS_MS, delay, describeWeather, forecast, geocode } from '../weather'
import { Timeline, type Track, trackPromise, useTimeline } from '../timeline'
import { hop, runLatest, tracked } from '../fx'
import { Fact, type Impl, ImplSwitch, type Status, StatusPill, WeatherIcon, placeLabel } from '../components'
import {
  cardClass,
  cardHead,
  cardTitle,
  cityItem,
  cityList,
  facts,
  ghost,
  scenario,
  scenarioBar,
  scenarioCard,
  scenarioTimeline,
  toastClass,
  toasts as toastStack,
  weatherCity,
  weatherClass,
  weatherCountry,
  weatherMain,
  weatherTemp,
  weatherUnit,
} from '../ui'

const CITIES = ['Berlin', 'Paris', 'London', 'Zurich'] as const

/** Each hop on the detail screen waits this long, so there is time to press Back. */
const DETAIL_DELAY_MS = DEFAULT_CHAOS_MS

interface DetailView {
  readonly city: City | null
  readonly status: Status
}

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

interface DetailScreenProps {
  readonly name: string
  readonly track: Track
  readonly onLoaded: (city: City) => void
  readonly onBack: () => void
}

function DetailCard({ impl, name, view, onBack }: { impl: Impl; name: string; view: DetailView; onBack: () => void }) {
  const { city, status } = view
  return (
    <section className={`${cardClass(impl)} ${scenarioCard}`}>
      <header className={cardHead()}>
        <div>
          <button type="button" className={`${ghost} mb-3.5`} onClick={onBack}>
            ← Back to cities
          </button>
          <h2 className={cardTitle(impl)}>{name}</h2>
        </div>
        <StatusPill status={status} />
      </header>
      <div className={weatherClass(!city, status === 'loading')}>
        <WeatherIcon code={city?.reading.weatherCode ?? null} />
        <div className={weatherMain}>
          <div className={weatherTemp()} data-temp data-dim>
            {city ? city.reading.temperature.toFixed(1) : '--'}
            <span className={weatherUnit}>°C</span>
          </div>
          <div className={weatherCity} data-dim>{city?.place.name ?? 'Loading…'}</div>
          <div className={weatherCountry}>{city ? describeWeather(city.reading.weatherCode) : 'Press Back before it loads'}</div>
        </div>
      </div>
      <dl className={facts}>
        <Fact label="Place">{city ? placeLabel(city.place) : '—'}</Fact>
        <Fact label="Coordinates">{city ? `${city.place.latitude.toFixed(2)}, ${city.place.longitude.toFixed(2)}` : '—'}</Fact>
      </dl>
    </section>
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

interface Toast {
  readonly id: string
  readonly text: string
  readonly isStale: boolean
}

function ListCard({ impl, onOpen, recent }: { impl: Impl; onOpen: (name: string) => void; recent: ReadonlyArray<string> }) {
  return (
    <section className={`${cardClass(impl)} ${scenarioCard}`}>
      <header className={cardHead()}>
        <h2 className={cardTitle(impl)}>Cities</h2>
      </header>
      <div className={cityList}>
        {CITIES.map((name) => (
          <button key={name} type="button" className={cityItem} aria-label={`Open ${name}`} onClick={() => onOpen(name)}>
            <span>{name}</span>
            <span aria-hidden>→</span>
          </button>
        ))}
      </div>
      <dl className={facts}>
        <Fact label="Recently viewed" isAlert={recent.length > 0 && impl === 'useEffect'}>
          {recent.length === 0 ? 'nothing yet' : recent.join(', ')}
        </Fact>
      </dl>
    </section>
  )
}

/** Leaving a screen while it loads: who still writes to the app after the screen is gone. */
export function DetailViewScenario() {
  const [impl, setImpl] = useState<Impl>('useEffect')
  const [open, setOpen] = useState<string | null>(null)
  const [recent, setRecent] = useState<ReadonlyArray<string>>([])
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([])
  const { rows, track, clear } = useTimeline()
  const openRef = useRef<string | null>(null)
  openRef.current = open

  const onLoaded = useCallback((city: City) => {
    const isStale = openRef.current !== city.place.name
    const id = crypto.randomUUID()
    const text = isStale ? `${city.place.name} finished loading, but you already left it` : `${city.place.name} is ready`
    setToasts((prev) => [...prev, { id, text, isStale }])
    setRecent((prev) => [city.place.name, ...prev.filter((n) => n !== city.place.name)].slice(0, 4))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const switchImpl = (next: Impl) => {
    setImpl(next)
    setOpen(null)
    setRecent([])
    setToasts([])
    clear()
  }
  const openCity = (name: string) => {
    clear()
    setOpen(name)
  }

  const Detail = impl === 'useEffect' ? BrokenDetail : EffectDetail
  return (
    <div className={scenario()}>
      <div className={scenarioBar}>
        <ImplSwitch value={impl} onChange={switchImpl} />
      </div>
      {open ? (
        <Detail key={`${impl}-${open}`} name={open} track={track} onLoaded={onLoaded} onBack={() => setOpen(null)} />
      ) : (
        <ListCard impl={impl} onOpen={openCity} recent={recent} />
      )}
      <div className={scenarioTimeline}>
        <Timeline rows={rows} emptyText="Open a city, then go back before it loads." />
      </div>
      <div className={toastStack} aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={toastClass(t.isStale)}>
            {t.text}
          </p>
        ))}
      </div>
    </div>
  )
}
