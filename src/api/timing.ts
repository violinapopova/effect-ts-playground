/** The conference-wifi delay every scenario uses. */
export const DEFAULT_CHAOS_MS = 1200

/**
 * How long a response sits on the floor before it reaches setState.
 * Short prefixes ("ber") get the full slider value, longer queries a quarter of it,
 * so the abandoned request reliably lands after the one the user actually wants.
 */
export const wifiDelay = (name: string, chaosMs: number): number =>
  name.trim().length <= 3 ? chaosMs : Math.round(chaosMs / 4)

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
