import { describe, expect, it } from 'vitest'
import { wifiDelay } from '@/api/timing'

describe('wifiDelay', () => {
  it('gives short queries the full delay, so "ber" lands after "bern"', () => {
    expect(wifiDelay('ber', 1200)).toBe(1200)
    expect(wifiDelay('bern', 1200)).toBe(300)
    expect(wifiDelay('ber', 1200)).toBeGreaterThan(wifiDelay('bern', 1200))
  })

  it('ignores surrounding spaces', () => {
    expect(wifiDelay('  ber  ', 1200)).toBe(1200)
  })
})
