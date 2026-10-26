import { describeWeather } from '@/api/weather'
import { Card, Fact, Facts, SearchInput, WeatherPanel } from '@/components'
import { hasQuery, isSamePlace, placeLabel } from '@/domain/places'
import type { CityCardProps } from './props'

/** The Search race card. Glows coral when the forecast belongs to another city. */
export function CityCard({ name, onNameChange, view }: CityCardProps) {
  const { impl, place, reading, status } = view
  const isMismatch = !!place && !!reading && !isSamePlace(place, reading.forPlace)
  const cityLabel = place?.name ?? (hasQuery(name) && status === 'idle' ? 'No match' : 'Somewhere')

  return (
    <Card impl={impl} title={impl} status={status} isStale={isMismatch}>
      <SearchInput value={name} onChange={onNameChange} />

      <WeatherPanel
        weatherCode={reading?.weatherCode ?? null}
        temperature={reading?.temperature ?? null}
        title={cityLabel}
        subtitle={place ? [place.admin1, place.country].filter(Boolean).join(', ') : 'Type a city to begin'}
        isEmpty={!place && !reading}
        isLoading={status === 'loading'}
        isTemperatureAlert={isMismatch}
      />

      <Facts>
        <Fact label="Weather code">
          {reading ? `${reading.weatherCode} · ${describeWeather(reading.weatherCode)}` : '—'}
        </Fact>
        <Fact label="Forecast for" isAlert={isMismatch}>
          {reading ? placeLabel(reading.forPlace) : '—'}
        </Fact>
      </Facts>
    </Card>
  )
}
