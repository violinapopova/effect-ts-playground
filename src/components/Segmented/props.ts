export interface SegmentedProps<T extends string> {
  readonly label: string
  readonly options: ReadonlyArray<{ readonly value: T; readonly text: string }>
  readonly value: T
  readonly onChange: (value: T) => void
}
