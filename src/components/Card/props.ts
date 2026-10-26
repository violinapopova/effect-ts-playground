import type { ReactNode } from 'react'
import type { CardImpl, Status } from '@/components/types'

export interface CardProps {
  readonly impl: CardImpl
  readonly title: ReactNode
  /** Shows the status pill in the header when set. */
  readonly status?: Status
  /** Marks the card as showing data for the wrong place: coral border, shake, "stale data" ribbon. */
  readonly isStale?: boolean
  /** Rendered above the title, e.g. a Back button. */
  readonly action?: ReactNode
  readonly children: ReactNode
}
