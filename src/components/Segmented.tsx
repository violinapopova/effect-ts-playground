import { segmentButton, segmented } from '../ui'

interface SegmentedProps<T extends string> {
  readonly label: string
  readonly options: ReadonlyArray<{ readonly value: T; readonly text: string }>
  readonly value: T
  readonly onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className={segmented}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={segmentButton(option.value === value)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.text}
        </button>
      ))}
    </fieldset>
  )
}
