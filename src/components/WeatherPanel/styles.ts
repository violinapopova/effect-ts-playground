import { join } from '@/styles/ui'

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
