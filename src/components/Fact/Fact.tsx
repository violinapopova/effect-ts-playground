import { factClass, factLabel, factValue } from './styles'
import type { FactProps } from './props'

export function Fact({ label, isAlert, children }: FactProps) {
  return (
    <div className={factClass(isAlert)}>
      <dt className={factLabel(isAlert)}>{label}</dt>
      <dd className={factValue}>{children}</dd>
    </div>
  )
}
