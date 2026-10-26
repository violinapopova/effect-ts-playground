import { StatusPill } from '@/components/StatusPill/StatusPill'
import type { CardProps } from './props'
import { cardClass, cardHead, cardRibbon, cardTitle } from './styles'

/** The glass card every scenario screen is built on: title, optional status pill, body. */
export function Card({ impl, title, status, isStale = false, action, children }: CardProps) {
  return (
    <section className={cardClass(impl, isStale)}>
      {isStale && <div className={cardRibbon}>stale data</div>}
      <header className={cardHead(isStale)}>
        <div>
          {action}
          <h2 className={cardTitle(impl)}>{title}</h2>
        </div>
        {status && <StatusPill status={status} />}
      </header>
      {children}
    </section>
  )
}
