// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePreference } from '@/hooks/usePreference'

type Tab = 'search' | 'air'
const isTab = (value: string | null): value is Tab => value === 'search' || value === 'air'
const KEY = 'test.tab'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('usePreference', () => {
  it('falls back when nothing is saved', () => {
    const { result } = renderHook(() => usePreference(KEY, isTab, 'search'))
    expect(result.current[0]).toBe('search')
  })

  it('reads a saved value', () => {
    localStorage.setItem(KEY, 'air')
    const { result } = renderHook(() => usePreference(KEY, isTab, 'search'))
    expect(result.current[0]).toBe('air')
  })

  it('ignores a saved value that is no longer valid', () => {
    localStorage.setItem(KEY, 'retired-tab')
    const { result } = renderHook(() => usePreference(KEY, isTab, 'search'))
    expect(result.current[0]).toBe('search')
  })

  it('updates the value and remembers it', () => {
    const { result } = renderHook(() => usePreference(KEY, isTab, 'search'))

    act(() => result.current[1]('air'))

    expect(result.current[0]).toBe('air')
    expect(localStorage.getItem(KEY)).toBe('air')
  })

  it('still works when storage refuses writes', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    try {
      const { result } = renderHook(() => usePreference(KEY, isTab, 'search'))
      act(() => result.current[1]('air'))
      expect(result.current[0]).toBe('air')
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
