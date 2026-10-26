import type { Row } from '@/lib/track'

export interface TimelineProps {
  readonly rows: ReadonlyArray<Row>
  readonly emptyText: string
}
