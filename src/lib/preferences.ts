/** Browser storage that may throw (private mode, blocked storage). Callers keep working either way. */
export const readPreference = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writePreference = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private windows can refuse storage; in-memory state still applies for this session.
  }
}
