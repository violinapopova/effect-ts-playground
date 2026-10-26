import { join } from '@/styles/ui'

export const metric = (alert = false) =>
  join(
    'ml-auto flex min-w-20 flex-col items-center gap-1 rounded-[14px] border border-white/8 bg-black/18 px-3 py-2.5 max-[560px]:ml-0',
    alert && 'border-coral shadow-[0_0_0_4px_rgb(225_90_74/0.3)]',
  )

export const metricValue = (alert = false) =>
  join('text-[30px] leading-none font-extrabold tabular-nums', alert && 'text-coral')

export const metricLabel = 'text-center text-xs font-semibold tracking-[0.06em] text-cream/60 uppercase'
