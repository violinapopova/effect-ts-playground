// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from '@/hooks/useNow'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  vi.setSystemTime(1_000)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useNow', () => {
  it('stays still while not ticking', () => {
    const { result } = renderHook(() => useNow(false))

    act(() => vi.advanceTimersByTime(500))

    expect(result.current).toBe(1_000)
  })

  it('follows the clock every frame while ticking', () => {
    const { result } = renderHook(() => useNow(true))

    act(() => vi.advanceTimersByTime(500))

    expect(result.current).toBeGreaterThanOrEqual(1_480)
  })

  it('stops requesting frames once ticking ends', () => {
    const { result, rerender } = renderHook(({ isTicking }) => useNow(isTicking), { initialProps: { isTicking: true } })
    act(() => vi.advanceTimersByTime(100))

    rerender({ isTicking: false })
    const stoppedAt = result.current
    act(() => vi.advanceTimersByTime(500))

    expect(result.current).toBe(stoppedAt)
    expect(vi.getTimerCount()).toBe(0)
  })
})
