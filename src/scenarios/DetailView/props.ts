import type { City } from '@/api/weather'
import type { Track } from '@/lib/track'
import type { Impl, Status } from '@/components'

/** What the detail screen shows. */
export interface DetailView {
  readonly city: City | null
  readonly status: Status
}

export interface DetailScreenProps {
  readonly name: string
  readonly track: Track
  readonly onLoaded: (city: City) => void
  readonly onBack: () => void
}

export interface DetailCardProps {
  readonly impl: Impl
  readonly name: string
  readonly view: DetailView
  readonly onBack: () => void
}

export interface ListCardProps {
  readonly impl: Impl
  readonly onOpen: (name: string) => void
  readonly recent: ReadonlyArray<string>
}
