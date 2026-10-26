import { Data } from 'effect'

/** One request in a load: find the city, then its forecast and air quality. */
export type Step = 'geocode' | 'forecast' | 'air'

/** A real transport or HTTP failure. The only thing that turns a timeline row red. */
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly step: Step
  readonly reason: string
}> {}
