# SkySwitch

The demo app from the talk **Controlling Async Chaos in React with Effect**. A weather search
that calls the real Open-Meteo APIs and shows, scenario by scenario, how `useEffect` code races,
and how Effect fixes it by interrupting fibers.

Everything runs in the browser: no backend, no API key.

## Run it

You need Node 22.22+ or 24.15+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## What you're looking at

- **Scenario tabs:** Search race, Air quality, Flaky server, Leave the screen.
- **Live API / Offline:** Live calls Open-Meteo. Offline replays responses recorded from it, with
  the same per-request timing, so every scenario works without a network. Your choice is
  remembered in the browser.
- **The card** on the left shows what the user sees. When it shows data for the wrong city, it
  turns coral and gets a "stale data" ribbon.
- **The request timeline** on the right shows every request the scenario made:
  **running**, **landed** (finished and used), **interrupted** (grey: cancelled, no harm done),
  or **failed** (coral: a real network error).

Every scenario except Search race has a **useEffect / Effect** switch, so you can compare both
versions without touching the code. Search race is switched in the code itself (see below).

Each scenario is built on the same trick: a short search like `ber` gets a slower response than
the longer `bern` you type next, so the request you abandoned lands last. That is the race.

## The scenarios

### Search race

The card's title shows which implementation is live: `useEffect` or `Effect`.

1. Type `ber`, then add `n` so it reads `bern`.
2. With `useEffect`, the card shows **Bern, Switzerland** with **Berlin's temperature**. It glows
   coral and says "Forecast for Berlin, Germany". In the timeline, `forecast ber` lands last.
3. Now switch to Effect in the code. In `src/App.tsx`, select the block under the `// USEEFFECT`
   banner (down to the `// EFFECT` banner) and comment it out with `Cmd+/` (`Ctrl+/` on Windows
   and Linux). Then select the block under the `// EFFECT` banner and uncomment it. Save: the
   title switches to `Effect` and the timeline resets.
4. Clear the input and type `ber`, then `n` again. `geocode ber` turns grey as **interrupted**,
   `forecast ber` never starts, and the temperature matches Bern.

**The Atom version.** The **useCity hook / Atom** switch above the card swaps the data source
for one that reads an atom per search term with `useAtomValue`
(`src/scenarios/SearchRace/atomCity.ts`):

```ts
const cityAtom = Atom.family((name: string) =>
  Atom.make(loadCity(name)).pipe(Atom.setIdleTTL(0)),
)
```

Type `ber`, then `n`: `geocode ber` is interrupted and the card shows Bern, with no `useEffect`
and no cleanup. When the search changes, nothing reads the `ber` atom any more, so the registry
disposes it and interrupts its fiber. `setIdleTTL(0)` makes that immediate; by default the
registry waits 400 ms before disposing an unused atom.

### Air quality: two requests in parallel

After finding the city, the forecast and the air quality load in parallel. The air quality
request is slower on purpose (`AIR_EXTRA_MS`).

- **useEffect:** type `ber`, then `n`. The `AbortController` was only passed to the forecast, so
  Berlin's air quality still lands on the Bern card: "Air quality for Berlin, Germany", in coral.
- **Effect:** the `ber` fiber stops before it starts either request. To see both requests stop
  together, type `par`, wait until the forecast and air rows appear, then add `is`: both rows
  turn grey.

Code: `src/scenarios/AirQuality/AirQuality.tsx` (`Effect.all` with `concurrency: "unbounded"`).

### Flaky server: retries

Every forecast fails twice with a 503, then succeeds (`FLAKY_FAILURES` in
`src/api/flakyServer.ts`). This is only switched on while the scenario is open. **Reset server**
forgets earlier attempts.

- **useEffect:** a hand-written retry loop. Type `ber`, then `n`. The `cancelled` flag guards the
  state update but not the loop, so Berlin is retried three times after you moved on. The
  **wasted requests** counter shows it.
- **Effect:** `Effect.retry` with `Schedule.exponential` and jitter, inside the fiber. The counter
  stays at 0: the `ber` fiber is interrupted, so its retries never happen.

Code: `src/scenarios/FlakyRetry/FlakyRetry.tsx`.

### Leave the screen: unmounting mid-request

A city list and a detail screen. Each request on the detail screen takes about 1.2 s.

- **useEffect:** open **Berlin** and press **Back** within two seconds. The screen is gone, but
  its request finishes anyway: a coral toast says "Berlin finished loading, but you already left
  it", and Berlin appears under **Recently viewed**.
- **Effect:** the same steps interrupt the screen's fiber when it unmounts. The row turns grey,
  no toast, nothing in Recently viewed. If you stay, the toast says "Berlin is ready".

Code: `src/scenarios/DetailView/DetailView.tsx`.

## How it works

**Why the races happen.** Each request waits for an artificial "conference wifi" delay after its
real response (`src/api/timing.ts`). Searches of three characters or fewer get the full delay
and longer ones a quarter of it, so `ber`, typed first, lands after `bern`. Without this, the
race would depend on your connection. The `useEffect` versions each look reasonable: a
`cancelled` flag, an `AbortController`, a retry loop. Each guards one thing and misses another.

**Why Effect fixes them.**

- Every Effect version runs its work as a child fiber (`Effect.forkChild`) and waits for its
  `Exit`. The `useEffect` cleanup interrupts the parent, and supervision interrupts the child
  with everything under it: requests, `Effect.all` branches, retry schedules, sleeps.
- Each fetch is `Effect.tryPromise` with a typed `NetworkError`, and receives the fiber's
  `AbortSignal`, so an interrupt cancels the HTTP request too.
- An interrupt is not an error. It greys out the timeline row and leaves state alone. Only a
  real `NetworkError`, like the flaky server's 503, turns a row coral.

The shared helpers are in `src/lib/fx.ts`: `request`, `hop`, `tracked` and `runLatest`.

## Things to try

- **Change the timing.** Raise `DEFAULT_CHAOS_MS` in `src/api/timing.ts` (or `CHAOS_MS` in
  `src/App.tsx` for Search race) and watch the races get wider.
- **Make the server flakier.** Set `FLAKY_FAILURES` above `RETRIES` in
  `src/scenarios/FlakyRetry/FlakyRetry.tsx` and see how each version fails. Then swap
  `Schedule.exponential` for `Schedule.spaced` and compare the timeline.
- **Keep unused atoms alive longer.** Remove `Atom.setIdleTTL(0)` in `atomCity.ts`: `geocode ber`
  is still interrupted, but 400 ms later.
- **Add a timeout.** Pipe a request through `Effect.timeout` and see how a timeout shows up next
  to an interrupt.
- **Fix a `useEffect` version yourself,** for example by passing the `AbortController` to the air
  quality request. Then run `npm run check-demo`: it reports that the bug is gone, because it
  exists to keep the bugs in.

## Project structure

```
src/
├── main.tsx              entry point
├── App.tsx               app shell, Search race, and the useEffect / Effect code swap
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
  demonstrates. Please don't send fixes for them; `npm run check-demo` fails if one stops
  misbehaving.

## Development

```bash
npm run check       # typecheck, lint (Oxlint), format check (Prettier), unit tests (Vitest)
npm run check-demo  # every scenario in a headless Chrome, in Offline mode
npm run record      # re-record the offline responses from Open-Meteo
```

`npm run check-demo` checks in a real browser that each `useEffect` version still shows its bug
and each Effect version still fixes it. It also performs the Search race code swap (in memory,
on a second dev server; `src/App.tsx` itself is never changed), checks both states, and
typechecks the swapped code. Finally it checks that the page requests nothing from the internet.
It needs Chrome; set `CHROME_PATH` if it is not found. It takes about a minute and a half.

`src/api/fixtures.json` holds the recorded responses for common prefixes of Berlin, Bern, Paris,
London, Zurich, Rome, Vienna and Madrid. Other cities only work in Live mode.

Notes:

- React `StrictMode` is off on purpose: it mounts every screen twice in development, which would
  add a second request to every demo.
- `@effect/atom-react` 4.0.1 asks for `scheduler` below 0.28, while React 19.3 uses 0.28, so the
  project pins `scheduler@0.27.0` for the atom package. React keeps its own copy.
- The lint runs on Oxlint because typescript-eslint does not support TypeScript 7.
- The files with the demo code are left out of Prettier (see `.prettierignore`), so they keep the
  layout shown in the talk.

## License

[MIT](LICENSE)
