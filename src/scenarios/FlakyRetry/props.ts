import type { City } from '@/api/weather'
import type { Track } from '@/lib/track'
import type { Impl, Status } from '@/components'

/** What the flaky server card shows. */
export interface RetryView {
  readonly city: City | null
  readonly status: Status
}

export interface RetryCardProps {
  readonly impl: Impl
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly view: RetryView
  readonly wasted: number
}

export interface RetryScreenProps {
  readonly name: string
  readonly onNameChange: (name: string) => void
  readonly track: Track
  readonly wasted: number
}
