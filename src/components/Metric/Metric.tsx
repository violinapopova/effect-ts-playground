import type { MetricProps } from './props'
import { metric, metricLabel, metricValue } from './styles'

/** A big number with a caption, shown beside the weather (air quality, wasted requests). */
export function Metric({ value, label, isAlert = false }: MetricProps) {
  return (
    <div className={metric(isAlert)}>
      <span className={metricValue(isAlert)}>{value}</span>
      <span className={metricLabel}>{label}</span>
    </div>
  )
}
