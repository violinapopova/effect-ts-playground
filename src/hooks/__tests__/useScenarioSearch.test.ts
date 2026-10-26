// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScenarioSearch } from '@/hooks/useScenarioSearch'

afterEach(cleanup)

type Impl = 'useEffect' | 'Effect'

/** Renders the hook and records one timeline row, so tests can see when the timeline is cleared. */
const renderWithRow = (onRestart?: () => void) => {
  const hook = renderHook(() => useScenarioSearch<Impl>('useEffect', onRestart))
  act(() => {
    hook.result.current.track.start('geocode ber', 'ber')
  })
  return hook
}

describe('useScenarioSearch', () => {
  it('starts on the given version with an empty search', () => {
    const { result } = renderHook(() => useScenarioSearch<Impl>('useEffect'))
    expect(result.current.variant).toBe('useEffect')
    expect(result.current.name).toBe('')
    expect(result.current.rows).toEqual([])
  })

  it('keeps the timeline while the search is long enough to fire requests', () => {
    const onRestart = vi.fn<() => void>()
    const { result } = renderWithRow(onRestart)

    act(() => result.current.changeName('ber'))
    act(() => result.current.changeName('bern'))

    expect(result.current.name).toBe('bern')
    expect(result.current.rows).toHaveLength(1)
    expect(onRestart).not.toHaveBeenCalled()
  })

  it('starts over when the search gets too short', () => {
    const onRestart = vi.fn<() => void>()
    const { result } = renderWithRow(onRestart)

    act(() => result.current.changeName('b'))

    expect(result.current.name).toBe('b')
    expect(result.current.rows).toEqual([])
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('switching version clears the search and the timeline', () => {
    const onRestart = vi.fn<() => void>()
    const { result } = renderWithRow(onRestart)
    act(() => result.current.changeName('bern'))

    act(() => result.current.changeVariant('Effect'))

    expect(result.current.variant).toBe('Effect')
    expect(result.current.name).toBe('')
    expect(result.current.rows).toEqual([])
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('restart clears the search and the timeline but keeps the version', () => {
    const onRestart = vi.fn<() => void>()
    const { result } = renderWithRow(onRestart)
    act(() => result.current.changeVariant('Effect'))
    act(() => result.current.changeName('bern'))

    act(() => result.current.restart())

    expect(result.current.variant).toBe('Effect')
    expect(result.current.name).toBe('')
    expect(onRestart).toHaveBeenCalledTimes(2)
  })

  it('works without an onRestart', () => {
    const { result } = renderWithRow()
    act(() => result.current.restart())
    expect(result.current.rows).toEqual([])
  })
})
