// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToasts } from '@/hooks/useToasts'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useToasts', () => {
  it('shows a toast and dismisses it after the duration', () => {
    const { result } = renderHook(() => useToasts(4000))

    act(() => result.current.show('Berlin is ready', false))
    expect(result.current.toasts).toEqual([expect.objectContaining({ text: 'Berlin is ready', isStale: false })])

    act(() => vi.advanceTimersByTime(3999))
    expect(result.current.toasts).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.toasts).toEqual([])
  })

  it('dismisses each toast on its own schedule', () => {
    const { result } = renderHook(() => useToasts(4000))

    act(() => result.current.show('Berlin finished loading, but you already left it', true))
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.show('Paris is ready', false))
    act(() => vi.advanceTimersByTime(2000))

    expect(result.current.toasts.map((toast) => toast.text)).toEqual(['Paris is ready'])
  })

  it('clears every toast at once', () => {
    const { result } = renderHook(() => useToasts())
    act(() => {
      result.current.show('one', false)
      result.current.show('two', true)
    })

    act(() => result.current.clear())

    expect(result.current.toasts).toEqual([])
  })

  it('keeps show stable across renders, so it is safe in effect dependencies', () => {
    const { result } = renderHook(() => useToasts())
    const { show } = result.current

    act(() => result.current.show('Berlin is ready', false))

    expect(result.current.show).toBe(show)
  })

  it('cancels pending dismiss timers when it unmounts', () => {
    const { result, unmount } = renderHook(() => useToasts())
    act(() => result.current.show('Berlin is ready', false))
    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('schedules nothing for a toast shown after it unmounted', () => {
    const { result, unmount } = renderHook(() => useToasts())
    const { show } = result.current
    unmount()

    show('Berlin finished loading, but you already left it', true)

    expect(vi.getTimerCount()).toBe(0)
  })
})
