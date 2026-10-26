import { Timeline } from '@/components/Timeline/Timeline'
import type { ScenarioLayoutProps } from './props'
import { scenario, scenarioBar, scenarioCard, scenarioTimeline } from './styles'

/** Toolbar on top, the card on the left, the request timeline on the right. */
export function ScenarioLayout({ toolbar, rows, emptyText, children }: ScenarioLayoutProps) {
  return (
    <div className={scenario}>
      <div className={scenarioBar}>{toolbar}</div>
      <div className={scenarioCard}>{children}</div>
      <div className={scenarioTimeline}>
        <Timeline rows={rows} emptyText={emptyText} />
      </div>
    </div>
  )
}
