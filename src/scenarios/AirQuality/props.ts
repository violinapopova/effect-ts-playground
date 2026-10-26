import type { AirReading, Place, Reading } from '@/api/weather'
import type { Track } from '@/lib/track'
import type { Impl, Status } from '@/components'

/** What the air quality card shows. */
export interface AirView {
  readonly place: Place | null
  readonly reading: Reading | null
  readonly air: AirReading | null
  readonly status: Status
}

export interface AirCardProps {
  readonly impl: Impl
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly view: AirView
}

export interface AirScreenProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly track: Track
}
