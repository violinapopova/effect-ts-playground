type Impl = 'useEffect' | 'Effect' | 'Atom'
type Status = 'idle' | 'loading' | 'failed'

const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

const glassSurface =
  'relative bg-[linear-gradient(145deg,rgb(255_255_255/0.11),rgb(255_255_255/0.07))] backdrop-blur-[28px] backdrop-saturate-150 rounded-[28px]'

const glassShadow = 'border border-white/16 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_30px_60px_-20px_rgb(0_0_0/0.55)]'

export const glass = `${glassSurface} ${glassShadow}`

const cardChrome =
  'overflow-hidden px-6 pt-[22px] pb-5 transition-[border-color,box-shadow] duration-300 max-[560px]:px-4 max-[560px]:py-[18px] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[\'\']'

export const cardClass = (impl: Impl, stale = false) =>
  join(
    glassSurface,
    cardChrome,
    stale
      ? 'animate-shake border border-coral/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_0_0_6px_rgb(225_90_74/0.3),0_0_60px_-10px_var(--color-coral),0_30px_60px_-20px_rgb(0_0_0/0.55)] before:bg-[linear-gradient(90deg,transparent,var(--color-coral),transparent)] before:opacity-100'
      : join(
          glassShadow,
          impl !== 'useEffect'
            ? 'before:bg-[linear-gradient(90deg,transparent,var(--color-teal),transparent)] before:opacity-100'
            : 'before:bg-[linear-gradient(90deg,transparent,var(--color-cream),transparent)] before:opacity-60',
        ),
  )

export const cardRibbon =
  'absolute top-7 -right-[46px] w-[180px] bg-coral py-1.5 text-center text-xs font-extrabold tracking-[0.14em] text-white uppercase shadow-[0_4px_14px_rgb(0_0_0/0.3)] rotate-[35deg]'

export const cardHead = (stale = false) =>
  join('mb-4 flex items-start justify-between gap-4', stale && 'pr-16')

export const cardTitle = (impl: Impl) =>
  join(
    'm-0 font-mono text-2xl font-bold tracking-[-0.02em]',
    impl !== 'useEffect' && 'text-[color-mix(in_srgb,var(--color-teal)_55%,var(--color-cream))]',
  )

export const pillClass = (status: Status) =>
  join(
    'inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/7 px-3.5 py-1.5 text-sm font-semibold text-cream/60',
    status === 'loading' && 'border-teal/50 bg-teal/25 text-[color-mix(in_srgb,var(--color-teal)_60%,var(--color-cream))]',
    status === 'failed' && 'border-coral bg-coral text-white',
  )

export const pillDot = (status: Status) =>
  join(
    'size-2 rounded-full bg-cream/40',
    status === 'loading' && 'animate-pulse-ring bg-teal',
    status === 'failed' && 'bg-white',
  )

export const segmented =
  'm-0 inline-flex min-w-0 flex-wrap gap-1 rounded-[14px] border border-white/8 bg-white/7 p-1 backdrop-blur-[20px]'

export const segmentButton = (pressed: boolean) =>
  join(
    'cursor-pointer rounded-[10px] border-0 px-3.5 py-2 font-sans text-sm font-semibold',
    pressed ? 'bg-cream text-ink-deep' : 'bg-transparent text-cream/60 hover:text-cream',
  )

export const searchIcon =
  'pointer-events-none absolute top-1/2 left-4 size-[19px] -translate-y-1/2 fill-none stroke-cream/60 stroke-[2.2] [stroke-linecap:round]'

export const searchInput =
  'w-full rounded-[14px] border border-white/8 bg-black/22 py-3 pr-4 pl-11 font-sans text-[19px] font-medium text-cream shadow-[inset_0_2px_8px_rgb(0_0_0/0.25)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-cream/40 focus:border-teal/80 focus:shadow-[inset_0_2px_8px_rgb(0_0_0/0.25),0_0_0_4px_rgb(42_157_143/0.25)]'

export const weatherClass = (empty: boolean, loading: boolean) =>
  join(
    'my-5 flex items-center gap-[18px] max-[560px]:flex-col max-[560px]:items-start',
    empty && '**:data-dim:text-cream/40 **:data-dim:[text-shadow:none]',
    loading && '**:data-temp:animate-breathe',
  )

export const weatherMain = 'min-w-0'

export const weatherTemp = (stale = false) =>
  join(
    'text-[clamp(46px,7vw,66px)] leading-[0.95] font-extrabold tracking-[-0.045em] tabular-nums [text-shadow:0_4px_30px_rgb(0_0_0/0.3)]',
    stale && 'text-coral [text-shadow:0_0_40px_rgb(225_90_74/0.3)]',
  )

export const weatherUnit = 'ml-1 align-[1em] text-[0.38em] font-semibold tracking-normal text-cream/60'

export const weatherCity = 'mt-1.5 text-[23px] font-bold tracking-[-0.02em]'

export const weatherCountry = 'mt-0.5 text-sm text-cream/60'

export const sky = 'size-[88px] shrink-0 overflow-visible drop-shadow-[0_8px_20px_rgb(0_0_0/0.35)]'

export const facts = 'm-0 grid grid-cols-2 gap-2.5'

export const factClass = (alert = false) =>
  join(
    'rounded-2xl border border-white/8 bg-black/18 px-3.5 py-2.5',
    alert && 'border-coral bg-coral text-white',
  )

export const factLabel = (alert = false) =>
  join('text-xs font-semibold tracking-[0.08em] text-cream/60 uppercase', alert && 'text-white/80')

export const factValue = 'mt-1 text-base font-semibold'

export const timeline = join(glass, 'px-[26px] pt-[22px] pb-4')

export const timelineHead = 'mb-2.5 flex items-baseline justify-between text-xs font-bold tracking-[0.08em] text-cream/60 uppercase'

export const timelineSpan = 'font-mono tracking-normal normal-case'

export const timelineEmpty = 'py-4 pb-2.5 text-[15px] text-cream/40'

export const timelineList = 'm-0 list-none p-0'

export const timelineRow =
  'grid animate-enter grid-cols-[minmax(126px,auto)_1fr_auto_122px] items-center gap-3.5 border-t border-white/8 py-[11px] max-[560px]:grid-cols-[1fr_auto]'

export const timelineLabel = (interrupted: boolean) =>
  join(
    'font-mono text-base font-bold whitespace-nowrap',
    interrupted && 'text-cream/40 line-through decoration-2',
  )

export const timelineTrack =
  'relative h-2.5 rounded-full bg-black/25 max-[560px]:col-span-full max-[560px]:row-start-2'

export const timelineBar = (state: 'running' | 'landed' | 'interrupted' | 'failed') =>
  join(
    'absolute inset-y-0 min-w-1.5 rounded-full bg-cream',
    state === 'running' &&
      'animate-stripes bg-size-[22px_22px] bg-[repeating-linear-gradient(-45deg,var(--color-teal)_0_8px,color-mix(in_srgb,var(--color-teal)_55%,var(--color-cream))_8px_16px)] shadow-[0_0_14px_rgb(42_157_143/0.25)]',
    state === 'interrupted' &&
      'bg-[repeating-linear-gradient(-45deg,rgb(251_246_241/0.4)_0_3px,transparent_3px_7px)] shadow-[inset_0_0_0_1.5px_rgb(251_246_241/0.4)]',
    state === 'failed' && 'bg-coral',
  )

export const timelineOffset = 'text-right font-mono text-[13px] text-cream/60 tabular-nums max-[560px]:hidden'

export const timelineState = (state: 'running' | 'landed' | 'interrupted' | 'failed') =>
  join(
    'justify-self-stretch rounded-full px-0 py-1 text-center text-[13px] font-bold',
    state === 'landed' && 'bg-cream text-ink-deep',
    state === 'running' && 'bg-teal text-white',
    state === 'interrupted' && 'border border-white/8 bg-white/7 text-cream/60',
    state === 'failed' && 'bg-coral text-white',
  )

export const scenario = (plain = false) =>
  join(
    'grid items-start gap-x-[22px] gap-y-[18px] max-[880px]:flex max-[880px]:flex-col max-[880px]:items-stretch',
    'grid-cols-[minmax(0,540px)_minmax(0,1fr)]',
    plain ? "[grid-template-areas:'card_timeline']" : "[grid-template-areas:'bar_bar'_'card_timeline']",
  )

export const scenarioCard = '[grid-area:card]'

export const scenarioTimeline = '[grid-area:timeline]'

export const scenarioBar = 'flex flex-wrap items-center justify-between gap-3 [grid-area:bar]'

export const ghost =
  'cursor-pointer rounded-[10px] border border-white/16 bg-transparent px-3.5 py-2 font-sans text-sm font-semibold text-cream/60 hover:border-cream/40 hover:text-cream'

export const aqi = (stale = false) =>
  join(
    'ml-auto flex min-w-20 flex-col items-center gap-1 rounded-[14px] border border-white/8 bg-black/18 px-3 py-2.5 max-[560px]:ml-0',
    stale && 'border-coral shadow-[0_0_0_4px_rgb(225_90_74/0.3)]',
  )

export const aqiValue = (stale = false) => join('text-[30px] leading-none font-extrabold tabular-nums', stale && 'text-coral')

export const aqiLabel = 'text-center text-xs font-semibold tracking-[0.06em] text-cream/60 uppercase'

export const cityList = 'mb-5 grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1'

export const cityItem =
  'flex cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-black/18 px-3.5 py-3 font-sans text-[17px] font-semibold text-cream hover:border-teal'

export const toasts =
  'pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-5 flex w-[min(520px,calc(100%-32px))] -translate-x-1/2 flex-col items-center gap-2'

export const toastClass = (stale: boolean) =>
  join(
    'animate-toast m-0 rounded-[14px] px-[18px] py-3 text-[15px] font-semibold shadow-[0_12px_30px_rgb(0_0_0/0.4)]',
    stale ? 'bg-coral text-white' : 'bg-cream text-ink-deep',
  )
