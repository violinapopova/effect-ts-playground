# SkySwitch

Live demo for **Controlling Async Chaos in React with Effect**. A weather search that hits the
real Open-Meteo APIs and shows, scenario by scenario, how `useEffect` races and how Effect
fixes it by interrupting fibers.

```bash
npm install && npm run dev
```

Stack: Vite, React 19, TypeScript (strict), `effect` 4.x. No API key needed.

## The toolbar

- **Scenario tabs:** Search race (the hero demo), Air quality, Flaky server, Leave the screen.
- **Live API / Offline:** Offline replays responses recorded from Open-Meteo, with the same
  per-request latency, so every scenario works without a network. Use it if your connection
  is shaky during the talk. The choice is remembered in the browser.

Every scenario except the hero has a **useEffect / Effect** switch, so you compare both
versions without editing code. The hero demo keeps the live code swap.

## Search race (hero demo, live code swap)

The card's title shows which implementation is live (`useEffect` or `Effect`), so it flips by
itself when you swap the code. The wifi delay is fixed at 1200 ms (`CHAOS_MS` in `src/App.tsx`).

1. Type `ber`, then add `n` so it reads `bern`.
2. The card shows **Bern, Switzerland** with **Berlin's temperature**: it glows coral, gets a
   "stale data" ribbon, and shows "Forecast for Berlin, Germany". The timeline shows
   `forecast ber` landing last.
3. In `src/App.tsx`, select everything under the `// USEEFFECT` banner down to the `// EFFECT`
   banner and press `Cmd+/` to comment it out. Then select the block under
   `// EFFECT — uncomment this block and comment the useEffect above` and press `Cmd+/` to
   uncomment it. Save. The title switches to `Effect` and the timeline resets.
4. Clear the input and type `ber`, then `n` again. The timeline shows `geocode ber` greyed out
   as `interrupted`, and `forecast ber` never starts. The temperature matches Bern.

### Atom version (slide "v4 ending: the atom owns the fiber")

The **useCity hook / Atom** switch above the Search race card swaps the data source. The hook
side is the live code swap above. The Atom side reads one atom per search term with
`useAtomValue` (`src/scenarios/SearchRace/atomCity.ts`):

```ts
const cityAtom = Atom.family((name: string) =>
  Atom.make(loadCity(name)).pipe(Atom.setIdleTTL(0)),
)
```

Type `ber`, then `n`: `geocode ber` is interrupted and the card shows Bern, with no
`useEffect` and no cleanup. When the search changes, nothing reads the `ber` atom any more, so
the registry disposes it and interrupts its fiber. `setIdleTTL(0)` makes that immediate; the
default registry otherwise waits 400 ms before disposing an unused atom.

`@effect/atom-react` 4.0.1 asks for `scheduler` below 0.28, while React 19.3 uses 0.28, so the
project pins `scheduler@0.27.0` for the atom package. React keeps its own copy.

## Air quality (fan-out, slide "Fan-out dies as a pair")

Forecast and air quality load in parallel after the geocode. The air quality hop is slower on
purpose (`AIR_EXTRA_MS`).

- **useEffect:** type `ber`, then `n`. The `AbortController` was only passed to the forecast,
  so Berlin's air quality still lands on the Bern card: "Air quality for Berlin, Germany" in
  coral, with the stale ribbon.
- **Effect:** the `ber` fiber stops before it fans out. To see both requests stop together,
  type `par`, wait until the forecast and air rows start, then add `is`: both rows turn grey.

Code: `src/scenarios/AirQuality/AirQuality.tsx` (`Effect.all` with `concurrency: "unbounded"`).

## Flaky server (retries, slides "Reinvented retries" and "A retry policy is data")

Every forecast fails twice with a 503, then succeeds (`FLAKY_FAILURES` in `src/api/flakyServer.ts`).
The scenario turns this on while it is open; **Reset server** forgets earlier attempts.

- **useEffect:** a hand-rolled retry loop. Type `ber`, then `n`. The flag guards the write, not
  the loop, so Berlin is retried three times after you moved on. The **wasted requests**
  counter shows it.
- **Effect:** `Effect.retry` with `Schedule.exponential` and jitter, inside the fiber. The
  counter stays at 0: the `ber` fiber is interrupted, so its retries never happen.

Code: `src/scenarios/FlakyRetry/FlakyRetry.tsx`.

## Leave the screen (unmount, slide "Interrupt the parent")

A city list and a detail screen. Each hop on the detail screen takes about 1.2 s.

- **useEffect:** open **Berlin** and press **Back** within two seconds. The screen is gone, but
  its request finishes anyway: a coral toast says "Berlin finished loading, but you already
  left it", and Berlin appears under **Recently viewed**.
- **Effect:** the same steps interrupt the screen's fiber on unmount. The row turns grey, no
  toast, nothing in Recently viewed. If you stay, the toast says "Berlin is ready".

Code: `src/scenarios/DetailView/DetailView.tsx`.

## How the races happen

- Each hop waits for the "conference wifi" delay after its real response. Short queries
  (≤ 3 characters) get the full delay and longer ones a quarter of it, so `ber` (typed first)
  lands after `bern`. Without this, the race would not show up reliably on stage.
- The `useEffect` versions each look reasonable: a `cancelled` flag, an `AbortController`, a
  retry loop. Each guards one thing and misses another.

## How the fixes work

- Every Effect version runs its work as a child fiber (`Effect.forkChild`) and awaits its
  `Exit`. The useEffect cleanup interrupts the parent, and auto-supervision interrupts the child
  with everything under it: requests, `Effect.all` branches, retry schedules, sleeps.
- Each fetch is `Effect.tryPromise` with a typed `NetworkError` and receives the fiber's
  `AbortSignal`, so an interrupt cancels the HTTP request too.
- An interrupt is not an error. It greys out the timeline row and leaves state alone. Only a
  real `NetworkError` (like the flaky server's 503) turns a row red.

Shared helpers: `src/lib/fx.ts` (`request`, `hop`, `tracked`, `runLatest`).

## Project structure

```
src/
├── main.tsx              entry point
├── App.tsx               app shell, Search race, and the live code swap
├── domain/               data types and rules, no React, no network
│   ├── weather.ts        Place, Reading, AirReading, City; weather code and AQI descriptions
│   ├── errors.ts         Step and NetworkError
│   └── places.ts         MIN_CHARS, hasQuery, isSamePlace, placeLabel
├── api/                  getting the data
│   ├── weather.ts        the barrel the scenarios import from
│   ├── openMeteo.ts      geocode, forecast, airQuality: URLs and response shapes
│   ├── transport.ts      the Transport interface, the live and offline transports
│   ├── flakyServer.ts    a Transport wrapper that fails forecasts with 503s
│   ├── networkMode.ts    the Live / Offline setting
│   ├── decode.ts         reads JSON bodies into domain values
│   ├── timing.ts         the "conference wifi" delay
│   └── fixtures.json     the offline recording
├── lib/
│   ├── fx.ts             Effect helpers: request, hop, tracked, runLatest
│   ├── track.ts          timeline row types and trackPromise
│   └── preferences.ts    localStorage that never throws
├── hooks/                useTimeline, useScenarioSearch, useToasts, usePreference, useNow
├── components/           shared UI, one folder per component, exported from index.ts
├── scenarios/            one folder per demo: AirQuality, FlakyRetry, DetailView, SearchRace
└── styles/               styles.css (Tailwind theme, animations) and ui.ts (shared class helpers)
```

Conventions:

- **Dependencies point inward.** `domain/` imports nothing from the app. `api/` and `lib/` use
  `domain/`. Hooks, components and scenarios sit on top. Oxlint's `import/no-cycle` keeps it so.
- **Imports:** `./` only for a file in the same folder (`./props`, `./styles`). Everything else
  goes through the `@/` alias for `src/`, e.g. `@/api/weather`. UI comes from the `@/components`
  barrel.
- **Components** live in `components/<Name>/`: `<Name>.tsx`, `props.ts` for its props, and
  `styles.ts` for its Tailwind classes. Scenario folders follow the same pattern.
- **Tests** sit next to the code they cover, in a `__tests__` folder. Hook tests run in jsdom
  (a `// @vitest-environment jsdom` line at the top); the rest run in Node.
- **The `useEffect` versions are wrong on purpose.** Each one has the bug its scenario
  demonstrates. Do not fix them; `npm run check-demo` fails if one stops misbehaving.

## Offline recording

`src/api/fixtures.json` holds responses for common prefixes of Berlin, Bern, Paris, London, Zurich,
Rome, Vienna and Madrid. To refresh it before a talk:

```bash
npm run record
```

React `StrictMode` is off on purpose: it mounts screens twice in development, which would add
a second load to every demo.

## Checks

```bash
npm run check       # typecheck, lint (Oxlint), format check (Prettier), unit tests (Vitest)
npm run check-demo  # every demo in a headless Chrome, in Offline mode
```

Run `npm run check-demo` before a talk and after any refactor. It fails if a `useEffect` version
stops showing its bug, or an Effect version stops fixing it. The Search race checks whichever
`useCity` block is live in `src/App.tsx`. It needs Chrome; set `CHROME_PATH` if it is not found.

The lint runs on Oxlint because typescript-eslint does not support TypeScript 7. The files with
the talk's code are left out of Prettier (see `.prettierignore`) so their slide layout stays put.
