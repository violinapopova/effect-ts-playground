import type { FactsProps } from './props'
import { facts } from './styles'

/** The two-column grid of Fact tiles at the bottom of a card. */
export function Facts({ children }: FactsProps) {
  return <dl className={facts}>{children}</dl>
}
