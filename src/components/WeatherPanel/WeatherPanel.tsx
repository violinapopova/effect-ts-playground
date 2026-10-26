import { WeatherIcon } from '@/components/WeatherIcon/WeatherIcon'
import type { WeatherPanelProps } from './props'
import { weatherCity, weatherClass, weatherCountry, weatherMain, weatherTemp, weatherUnit } from './styles'

/** Weather icon, temperature, and the place it is for. */
export function WeatherPanel({
  weatherCode,
  temperature,
  title,
  subtitle,
  isEmpty,
  isLoading,
  isTemperatureAlert = false,
  children,
}: WeatherPanelProps) {
  return (
    <div className={weatherClass(isEmpty, isLoading)}>
      <WeatherIcon code={weatherCode} />
      <div className={weatherMain}>
        <div className={weatherTemp(isTemperatureAlert)} data-temp data-dim>
          {temperature === null ? '--' : temperature.toFixed(1)}
          <span className={weatherUnit}>°C</span>
        </div>
        <div className={weatherCity} data-dim>
          {title}
        </div>
        <div className={weatherCountry}>{subtitle}</div>
      </div>
      {children}
    </div>
  )
}
