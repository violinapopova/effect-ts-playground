import { useState } from 'react'
import { useTimeline } from './useTimeline'
import { hasQuery } from '@/domain/places'

/**
 * The state every search scenario shares: which version is showing, the search text, and the
 * request timeline. Switching version or clearing the search starts the scenario over.
 * `onRestart` runs on every restart, e.g. to reset the flaky server.
 */
export function useScenarioSearch<T extends string>(initial: T, onRestart?: () => void) {
  const [variant, setVariant] = useState<T>(initial)
  const [name, setName] = useState('')
  const { rows, track, clear } = useTimeline()

  const restart = () => {
    onRestart?.()
    setName('')
    clear()
  }
  const changeVariant = (next: T) => {
    setVariant(next)
    restart()
  }
  const changeName = (next: string) => {
    if (!hasQuery(next)) {
      onRestart?.()
      clear()
    }
    setName(next)
  }

  return { variant, changeVariant, name, changeName, restart, rows, track, clear }
}
