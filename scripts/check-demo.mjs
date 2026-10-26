// Checks in a real browser that every demo still behaves as the talk needs: each useEffect
// version still shows its bug, and each Effect version still fixes it. Runs in Offline mode,
// so the timings are the same every time.
//
//   npm run check-demo
//
// Starts two dev servers and a headless Chrome. The second server serves src/App.tsx with the
// live code swap already done, so both states of the Search race are checked without touching
// the file. Set CHROME_PATH if Chrome is not in the usual place.

import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { swapLiveCode } from './swap-live-code.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const APP = join(ROOT, 'src', 'App.tsx')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startChrome() {
  const executable = CHROME_CANDIDATES.find((path) => path && existsSync(path))
  if (!executable) throw new Error('Chrome not found. Set CHROME_PATH to your Chrome or Chromium executable.')
  const profile = await mkdtemp(join(tmpdir(), 'check-demo-'))
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--window-size=1300,1000',
    ],
    { stdio: 'ignore' },
  )
  // Chrome writes the port it picked to DevToolsActivePort once it is ready.
  for (let i = 0; i < 100; i++) {
    const port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
      .then((text) => text.split('\n')[0])
      .catch(() => null)
    if (port) {
      const stop = async () => {
        chrome.kill()
        await sleep(300)
        await rm(profile, { recursive: true, force: true })
      }
      return { endpoint: `http://127.0.0.1:${port}`, stop }
    }
    await sleep(100)
  }
  chrome.kill()
  throw new Error('Chrome did not start')
}

async function openPage(endpoint) {
  const { webSocketDebuggerUrl } = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let nextId = 1
  const pending = new Map()
  const listeners = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      pending.get(message.id)?.(message)
      pending.delete(message.id)
    } else {
      listeners.get(message.method)?.(message.params)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
    return result.result.value
  }
  /** Calls `handler` for each CDP event named `method`; returns a function that stops listening. */
  const on = (method, handler) => {
    listeners.set(method, handler)
    return () => listeners.delete(method)
  }
  return { send, evaluate, on, close: () => ws.close() }
}

// --- Dev servers ------------------------------------------------------------------------

/** Serves src/App.tsx with the live code swap done, as if the presenter had just swapped it. */
const swappedAppPlugin = {
  name: 'check-demo:swapped-app',
  enforce: 'pre',
  transform(code, id) {
    if (id.split('?')[0] === APP) return swapLiveCode(code)
  },
}

async function startServer(port, extra = {}) {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port }, ...extra })
  await server.listen()
  return { url: server.resolvedUrls.local[0], close: () => server.close() }
}

/** Typechecks the swapped App.tsx in a throwaway copy of src. Returns tsc's output, or null if clean. */
function typecheckSwapped() {
  const dir = mkdtempSync(join(tmpdir(), 'check-demo-swap-'))
  try {
    cpSync(join(ROOT, 'src'), join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'App.tsx'), swapLiveCode(readFileSync(APP, 'utf8')))
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'junction')
    const tsconfig = {
      extends: join(ROOT, 'tsconfig.json'),
      compilerOptions: { paths: { '@/*': ['./src/*'] } },
      include: ['src'],
    }
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig))
    const tsc = spawnSync(join(ROOT, 'node_modules', '.bin', 'tsc'), ['--noEmit', '-p', dir], { encoding: 'utf8' })
    return tsc.status === 0 ? null : (tsc.stdout + tsc.stderr).trim()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// --- Page helpers -----------------------------------------------------------------------

/** Opens `tab` in Offline mode on a fresh page load. */
async function load(page, url, tab) {
  await page.send('Page.navigate', { url })
  await sleep(1000)
  await page.evaluate(
    `localStorage.setItem('skyswitch.network', 'offline'); localStorage.setItem('skyswitch.tab', '${tab}'); true`,
  )
  await page.send('Page.reload', { ignoreCache: true })
  await sleep(1500)
}

const click = (page, text) =>
  page.evaluate(`(() => {
    const target = ${JSON.stringify(text)}
    const button = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === target || b.getAttribute('aria-label') === target,
    )
    if (!button) throw new Error('No button "' + target + '"')
    button.click()
    return true
  })()`)

/** Types into the search box the way React sees a keystroke. */
const type = (page, value) =>
  page.evaluate(`(() => {
    const input = document.querySelector('input')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)

/** The value of the fact tile labelled `label`, or null. */
const fact = (page, label) =>
  page.evaluate(`(() => {
    const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent.trim().toLowerCase() === ${JSON.stringify(label.toLowerCase())})
    return dt ? dt.nextElementSibling.textContent.trim() : null
  })()`)

const cardTitle = (page) => page.evaluate(`document.querySelector('section h2')?.textContent.trim() ?? null`)
const isStale = (page) =>
  page.evaluate(`[...document.querySelectorAll('div')].some((d) => d.textContent.trim() === 'stale data')`)
const text = (page) => page.evaluate('document.body.innerText')
const wasted = (page) =>
  page.evaluate(`(() => {
    const label = [...document.querySelectorAll('span')].find((s) => s.textContent.trim().toLowerCase() === 'wasted requests')
    return Number(label.previousElementSibling.textContent)
  })()`)

/** Types "ber", then "bern" before the first search finishes: the race every scenario uses. */
async function berThenBern(page) {
  await type(page, 'ber')
  await sleep(150)
  await type(page, 'bern')
}

// --- Checks -----------------------------------------------------------------------------

const results = []
function check(name, ok, detail) {
  results.push(ok)
  console.log(`${ok ? '✓' : '✗'} ${name}\n    ${detail}`)
}

/** The page must not need the internet: conference wifi is exactly what the demo warns about. */
async function pageLoadsOffline(page, url) {
  const external = new Set()
  await page.send('Network.enable')
  const stop = page.on('Network.requestWillBeSent', ({ request }) => {
    const { protocol, hostname } = new URL(request.url)
    if (protocol.startsWith('http') && hostname !== 'localhost' && hostname !== '127.0.0.1') external.add(request.url)
  })
  await load(page, url, 'search')
  const fontLoaded = await page.evaluate(
    `document.fonts.ready.then(() => [...document.fonts].some((f) => f.family.includes('Inter Variable') && f.status === 'loaded'))`,
  )
  stop()
  await page.send('Network.disable')
  check(
    'Page · loads nothing from the internet',
    external.size === 0,
    external.size === 0 ? 'every request went to localhost' : `external requests: ${[...external].join(', ')}`,
  )
  check('Page · Inter font loaded from the bundle', fontLoaded, `Inter Variable loaded: ${fontLoaded}`)
}

/** Checks the Search race against whichever useCity block `url` serves. */
async function searchRace(page, url, where) {
  await load(page, url, 'search')
  const live = await cardTitle(page)
  await berThenBern(page)
  await sleep(4000)
  const forecastFor = await fact(page, 'Forecast for')
  const stale = await isStale(page)
  const interrupted = /geocode ber[\s\S]*?interrupted/.test(await text(page))
  const detail = `stale ribbon: ${stale}, Forecast for: "${forecastFor}", geocode ber interrupted: ${interrupted}`
  if (live === 'useEffect')
    check(`Search race · useEffect block (${where}) shows the bug`, stale && forecastFor === 'Berlin, Germany', detail)
  else if (live === 'Effect')
    check(
      `Search race · Effect block (${where}) fixes it`,
      !stale && forecastFor?.startsWith('Bern,') && interrupted,
      detail,
    )
  else check(`Search race · ${where}`, false, `unexpected card title "${live}"`)
  return live
}

async function searchRaceAtom(page, url) {
  await load(page, url, 'search')
  await click(page, 'Atom')
  await sleep(300)
  await berThenBern(page)
  await sleep(4000)
  const forecastFor = await fact(page, 'Forecast for')
  const stale = await isStale(page)
  const interrupted = /geocode ber[\s\S]*?interrupted/.test(await text(page))
  check(
    'Search race · Atom fixes it',
    !stale && forecastFor?.startsWith('Bern,') && interrupted,
    `stale ribbon: ${stale}, Forecast for: "${forecastFor}", geocode ber interrupted: ${interrupted}`,
  )
}

async function openImpl(page, url, tab, impl) {
  await load(page, url, tab)
  if (impl === 'Effect') {
    await click(page, 'Effect')
    await sleep(300)
  }
}

async function airQuality(page, url, impl) {
  await openImpl(page, url, 'air', impl)
  await berThenBern(page)
  await sleep(5500)
  const airFor = await fact(page, 'Air quality for')
  const stale = await isStale(page)
  const detail = `stale ribbon: ${stale}, Air quality for: "${airFor}"`
  if (impl === 'useEffect')
    check('Air quality · useEffect shows the bug', stale && airFor === 'Berlin, Germany', detail)
  else check('Air quality · Effect fixes it', !stale && airFor?.startsWith('Bern,'), detail)
}

async function flakyServer(page, url, impl) {
  await openImpl(page, url, 'retry', impl)
  await berThenBern(page)
  await sleep(7000)
  const count = await wasted(page)
  const forecastFor = await fact(page, 'Forecast for')
  const detail = `wasted requests: ${count}, Forecast for: "${forecastFor}"`
  if (impl === 'useEffect') check('Flaky server · useEffect shows the bug', count > 0, detail)
  else check('Flaky server · Effect fixes it', count === 0 && forecastFor?.startsWith('Bern,'), detail)
}

async function leaveTheScreen(page, url, impl) {
  await openImpl(page, url, 'detail', impl)
  await click(page, 'Open Berlin')
  await sleep(1000)
  await click(page, '← Back to cities')
  await sleep(3500)
  const leftToast = (await text(page)).includes('Berlin finished loading, but you already left it')
  const recent = await fact(page, 'Recently viewed')
  const detail = `"already left" toast: ${leftToast}, Recently viewed: "${recent}"`
  if (impl === 'useEffect')
    check('Leave the screen · useEffect shows the bug', leftToast && recent === 'Berlin', detail)
  else check('Leave the screen · Effect fixes it', !leftToast && recent === 'nothing yet', detail)
}

async function stayOnTheScreen(page, url) {
  await openImpl(page, url, 'detail', 'Effect')
  await click(page, 'Open Berlin')
  await sleep(3500)
  const ready = (await text(page)).includes('Berlin is ready')
  check('Leave the screen · Effect still loads when you stay', ready, `"Berlin is ready" toast: ${ready}`)
}

// --- Run --------------------------------------------------------------------------------

const typeErrors = typecheckSwapped()
check(
  'Search race · the swapped App.tsx typechecks',
  typeErrors === null,
  typeErrors ?? 'tsc found no errors after the swap',
)

const asIs = await startServer(5199)
// Its own cache dir, so the two servers do not pre-bundle into the same folder at once.
const swapped = await startServer(5198, {
  plugins: [swappedAppPlugin],
  cacheDir: join(ROOT, 'node_modules', '.vite-check-demo-swapped'),
})
const chrome = await startChrome()

try {
  const page = await openPage(chrome.endpoint)
  await page.send('Page.enable')
  console.log(`\nChecking ${asIs.url} (App.tsx as it is) and ${swapped.url} (swapped), in Offline mode…\n`)

  await pageLoadsOffline(page, asIs.url)
  const liveNow = await searchRace(page, asIs.url, 'live in App.tsx now')
  const liveAfterSwap = await searchRace(page, swapped.url, 'live after the swap')
  check(
    'Search race · the swap switches implementation',
    liveNow !== liveAfterSwap,
    `live now: ${liveNow}, after the swap: ${liveAfterSwap}`,
  )
  await searchRaceAtom(page, asIs.url)
  for (const impl of ['useEffect', 'Effect']) await airQuality(page, asIs.url, impl)
  for (const impl of ['useEffect', 'Effect']) await flakyServer(page, asIs.url, impl)
  for (const impl of ['useEffect', 'Effect']) await leaveTheScreen(page, asIs.url, impl)
  await stayOnTheScreen(page, asIs.url)

  page.close()
} finally {
  await chrome.stop()
  await Promise.all([asIs.close(), swapped.close()])
}

const failed = results.filter((ok) => !ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exitCode = failed ? 1 : 0
