import type { ReactNode } from 'react'
import { factClass, factLabel, factValue } from '../ui'

interface FactProps {
  readonly label: string
  readonly isAlert?: boolean
  readonly children: ReactNode
}

export function Fact({ label, isAlert, children }: FactProps) {
  return (
    <div className={factClass(isAlert)}>
      <dt className={factLabel(isAlert)}>{label}</dt>
      <dd className={factValue}>{children}</dd>
    </div>
  )
}
