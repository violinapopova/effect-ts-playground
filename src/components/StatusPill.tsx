import { pillClass, pillDot } from '../ui'
import type { Status } from './types'

export function StatusPill({ status }: { readonly status: Status }) {
  return (
    <span className={pillClass(status)}>
      <span className={pillDot(status)} />
      {status}
    </span>
  )
}
