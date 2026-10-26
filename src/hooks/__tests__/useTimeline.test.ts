// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTimeline } from '@/hooks/useTimeline'

afterEach(cleanup)

describe('useTimeline', () => {
  it('starts with no rows', () => {
    const { result } = renderHook(() => useTimeline())
    expect(result.current.rows).toEqual([])
  })

  it('adds a running row on start and settles it later', () => {
    const { result } = renderHook(() => useTimeline())

    let id = ''
    act(() => {
      id = result.current.track.start('geocode ber', 'ber')
    })
    expect(result.current.rows).toEqual([
      expect.objectContaining({ id, label: 'geocode ber', query: 'ber', state: 'running' }),
    ])
    expect(result.current.rows[0].endedAt).toBeUndefined()

    act(() => result.current.track.settle(id, 'interrupted'))
    expect(result.current.rows[0]).toMatchObject({ id, state: 'interrupted' })
    expect(result.current.rows[0].endedAt).toBeTypeOf('number')
  })

  it('settles only the row it is given', () => {
    const { result } = renderHook(() => useTimeline())
    let first = ''
    act(() => {
      first = result.current.track.start('geocode ber', 'ber')
      result.current.track.start('geocode bern', 'bern')
    })

    act(() => result.current.track.settle(first, 'landed'))

    expect(result.current.rows.map((row) => row.state)).toEqual(['landed', 'running'])
  })

  it('empties the rows on clear', () => {
    const { result } = renderHook(() => useTimeline())
    act(() => {
      result.current.track.start('geocode ber', 'ber')
    })

    act(() => result.current.clear())

    expect(result.current.rows).toEqual([])
  })

  it('keeps track and clear stable across renders, so effects can depend on them', () => {
    const { result } = renderHook(() => useTimeline())
    const { track, clear } = result.current

    act(() => {
      result.current.track.start('geocode ber', 'ber')
    })

    expect(result.current.track).toBe(track)
    expect(result.current.clear).toBe(clear)
  })
})
