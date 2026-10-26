import type { ReactNode } from 'react'

export interface FactProps {
  readonly label: string
  readonly isAlert?: boolean
  readonly children: ReactNode
}
