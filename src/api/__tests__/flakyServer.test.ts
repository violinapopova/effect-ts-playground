import { afterEach, describe, expect, it, vi } from 'vitest'
import { NetworkError } from '@/domain/errors'
import { FLAKY_FAILURES, setFlakyServer, withFlakyServer } from '@/api/flakyServer'
import type { Transport } from '@/api/transport'

const fakeTransport = () => {
  const get = vi.fn<Transport['get']>(async () => ({ ok: true }))
  return { transport: { get } satisfies Transport, get }
}

afterEach(() => setFlakyServer(false))

describe('withFlakyServer', () => {
  it('passes everything through while the server is off', async () => {
    const { transport, get } = fakeTransport()
    await expect(withFlakyServer(transport).get('forecast', 'url', 'bern')).resolves.toEqual({ ok: true })
    expect(get).toHaveBeenCalledOnce()
  })

  it(`fails each forecast ${FLAKY_FAILURES} times with a 503, then reaches the transport`, async () => {
    setFlakyServer(true)
    const { transport, get } = fakeTransport()
    const flaky = withFlakyServer(transport)

    for (let i = 0; i < FLAKY_FAILURES; i++) {
      await expect(flaky.get('forecast', 'url', 'bern')).rejects.toSatisfy(
        (error) => error instanceof NetworkError && error.step === 'forecast' && error.reason === 'HTTP 503',
      )
    }
    await expect(flaky.get('forecast', 'url', 'bern')).resolves.toEqual({ ok: true })
    expect(get).toHaveBeenCalledOnce()
  })

  it('counts attempts per place', async () => {
    setFlakyServer(true)
    const { transport } = fakeTransport()
    const flaky = withFlakyServer(transport)

    await expect(flaky.get('forecast', 'url', 'bern')).rejects.toThrow(NetworkError)
    await expect(flaky.get('forecast', 'url', 'berlin')).rejects.toThrow(NetworkError)
  })

  it('leaves geocoding and air quality alone', async () => {
    setFlakyServer(true)
    const { transport } = fakeTransport()
    const flaky = withFlakyServer(transport)

    await expect(flaky.get('geocode', 'url', 'bern')).resolves.toEqual({ ok: true })
    await expect(flaky.get('air', 'url', 'bern')).resolves.toEqual({ ok: true })
  })

  it('forgets earlier attempts when it is reset', async () => {
    setFlakyServer(true)
    const { transport } = fakeTransport()
    const flaky = withFlakyServer(transport)
    for (let i = 0; i < FLAKY_FAILURES; i++) await flaky.get('forecast', 'url', 'bern').catch(() => {})

    setFlakyServer(true)
    await expect(flaky.get('forecast', 'url', 'bern')).rejects.toThrow(NetworkError)
  })
})
