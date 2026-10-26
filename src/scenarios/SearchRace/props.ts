import type { Place, Reading } from '@/api/weather'
import type { CardImpl, Status } from '@/components'

/** What the Search race card shows, whichever implementation produced it. */
export interface CityView {
  readonly impl: CardImpl
  readonly place: Place | null
  readonly reading: Reading | null
  readonly status: Status
}

export interface CityCardProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly view: CityView
}
