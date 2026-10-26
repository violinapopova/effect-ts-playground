import type { ReactNode } from 'react'

export interface WeatherPanelProps {
  readonly weatherCode: number | null
  readonly temperature: number | null
  /** The big line under the temperature, usually the city name. */
  readonly title: string
  readonly subtitle: string
  /** Nothing to show yet: the title and temperature are dimmed. */
  readonly isEmpty: boolean
  /** The temperature breathes while a request is in flight. */
  readonly isLoading: boolean
  /** Turns the temperature coral when it belongs to another place. */
  readonly isTemperatureAlert?: boolean
  /** Shown on the right, e.g. a Metric. */
  readonly children?: ReactNode
}
