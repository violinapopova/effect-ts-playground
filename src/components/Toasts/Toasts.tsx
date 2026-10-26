import type { ToastsProps } from './props'
import { toastClass, toastStack } from './styles'

/** The stack of messages at the bottom of the screen. */
export function Toasts({ toasts }: ToastsProps) {
  return (
    <div className={toastStack} aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} className={toastClass(toast.isStale)}>
          {toast.text}
        </p>
      ))}
    </div>
  )
}
