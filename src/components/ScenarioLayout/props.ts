import type { ReactNode } from 'react'
import type { Row } from '@/lib/track'

export interface ScenarioLayoutProps {
  /** The bar above the card: implementation switch and any extra buttons. */
  readonly toolbar: ReactNode
  readonly rows: ReadonlyArray<Row>
  /** What the timeline says before the first request. */
  readonly emptyText: string
  /** The scenario's card. */
  readonly children: ReactNode
}
