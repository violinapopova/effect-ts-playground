import { useCallback, useEffect, useRef, useState } from 'react'
import type { Toast } from '@/components/Toasts/props'

type Timer = ReturnType<typeof setTimeout>

/**
 * Messages that dismiss themselves after `durationMs`. `show` is stable, so it is safe in
 * effect dependencies. Pending timers are cleared on unmount.
 */
export function useToasts(durationMs = 4000) {
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([])
  // Null while unmounted, so a late `show` schedules nothing.
  const timers = useRef<Set<Timer> | null>(null)

  useEffect(() => {
    const pending = new Set<Timer>()
    timers.current = pending
    return () => {
      pending.forEach(clearTimeout)
      timers.current = null
    }
  }, [])

  const show = useCallback(
    (text: string, isStale: boolean) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, text, isStale }])
      const pending = timers.current
      if (!pending) return
      const timer = setTimeout(() => {
        pending.delete(timer)
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, durationMs)
      pending.add(timer)
    },
    [durationMs],
  )

  const clear = useCallback(() => setToasts([]), [])

  return { toasts, show, clear }
}
