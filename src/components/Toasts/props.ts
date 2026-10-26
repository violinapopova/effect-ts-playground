export interface Toast {
  readonly id: string
  readonly text: string
  /** A message about a screen the user already left: shown in coral. */
  readonly isStale: boolean
}

export interface ToastsProps {
  readonly toasts: ReadonlyArray<Toast>
}
