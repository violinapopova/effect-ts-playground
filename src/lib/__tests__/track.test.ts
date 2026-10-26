import { describe, expect, it, vi } from 'vitest'
import { type Track, trackPromise } from '@/lib/track'

const fakeTrack = () => {
  const settle = vi.fn<Track['settle']>()
  const track: Track = { start: vi.fn<Track['start']>(() => 'row-1'), settle }
  return { track, settle }
}

describe('trackPromise', () => {
  it('marks a resolved request as landed and returns its value', async () => {
    const { track, settle } = fakeTrack()
    await expect(trackPromise(track, 'geocode ber', 'ber', async () => 42)).resolves.toBe(42)
    expect(track.start).toHaveBeenCalledWith('geocode ber', 'ber')
    expect(settle).toHaveBeenCalledWith('row-1', 'landed')
  })

  it('marks a rejected request as failed and rethrows', async () => {
    const { track, settle } = fakeTrack()
    await expect(trackPromise(track, 'forecast ber', 'ber', () => Promise.reject(new Error('503')))).rejects.toThrow(
      '503',
    )
    expect(settle).toHaveBeenCalledWith('row-1', 'failed')
  })

  it('marks an aborted request as interrupted', async () => {
    const { track, settle } = fakeTrack()
    const aborted = () => Promise.reject(new DOMException('The request was aborted', 'AbortError'))
    await expect(trackPromise(track, 'forecast ber', 'ber', aborted)).rejects.toThrow('The request was aborted')
    expect(settle).toHaveBeenCalledWith('row-1', 'interrupted')
  })
})
