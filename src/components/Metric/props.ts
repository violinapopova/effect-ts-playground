import type { ReactNode } from 'react'

export interface MetricProps {
  readonly value: ReactNode
  readonly label: string
  readonly isAlert?: boolean
}
