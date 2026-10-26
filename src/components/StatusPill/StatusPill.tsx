import { pillClass, pillDot } from './styles'
import type { StatusPillProps } from './props'

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={pillClass(status)}>
      <span className={pillDot(status)} />
      {status}
    </span>
  )
}
