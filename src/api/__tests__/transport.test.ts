import { describe, expect, it } from 'vitest'
import { NetworkError } from '@/domain/errors'
import { isAbortError, transportFor, wait } from '@/api/transport'

describe('offline transport', () => {
  const offline = transportFor('offline')

  it('answers from the recording', async () => {
    const body = (await offline.get('geocode', '', 'bern')) as { results: Array<{ name: string }> }
    expect(body.results[0].name).toBe('Bern')
  })

  it('answers an unknown city with no results, like the live API', async () => {
    expect(await offline.get('geocode', '', 'atlantis')).toEqual({})
  })

  it('fails a forecast that was not recorded', async () => {
    await expect(offline.get('forecast', '', '0,0')).rejects.toThrow(NetworkError)
  })

  it('rejects with an AbortError when the signal fires', async () => {
    const controller = new AbortController()
    const pending = offline.get('geocode', '', 'bern', controller.signal)
    controller.abort()
    await expect(pending).rejects.toSatisfy(isAbortError)
  })
})

describe('wait', () => {
  it('rejects straight away for a signal that already fired', async () => {
    await expect(wait(10_000, AbortSignal.abort())).rejects.toSatisfy(isAbortError)
  })
})
