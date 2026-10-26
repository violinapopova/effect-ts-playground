import { useState } from 'react'
import { readPreference, writePreference } from '@/lib/preferences'

/**
 * A choice remembered in browser storage, like the open scenario tab. Falls back to `fallback`
 * when nothing valid is saved.
 */
export function usePreference<T extends string>(
  key: string,
  isValid: (value: string | null) => value is T,
  fallback: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = readPreference(key)
    return isValid(saved) ? saved : fallback
  })

  const change = (next: T) => {
    setValue(next)
    writePreference(key, next)
  }

  return [value, change]
}
