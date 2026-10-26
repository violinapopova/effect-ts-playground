import type { RowState } from '@/lib/track'
import { glass, join } from '@/styles/ui'

export const timeline = join(glass, 'px-[26px] pt-[22px] pb-4')

export const timelineHead =
  'mb-2.5 flex items-baseline justify-between text-xs font-bold tracking-[0.08em] text-cream/60 uppercase'

export const timelineSpan = 'font-mono tracking-normal normal-case'

export const timelineEmpty = 'py-4 pb-2.5 text-[15px] text-cream/40'

export const timelineList = 'm-0 list-none p-0'

export const timelineRow =
  'grid animate-enter grid-cols-[minmax(126px,auto)_1fr_auto_122px] items-center gap-3.5 border-t border-white/8 py-[11px] max-[560px]:grid-cols-[1fr_auto]'

export const timelineLabel = (interrupted: boolean) =>
  join('font-mono text-base font-bold whitespace-nowrap', interrupted && 'text-cream/40 line-through decoration-2')

export const timelineTrack = 'relative h-2.5 rounded-full bg-black/25 max-[560px]:col-span-full max-[560px]:row-start-2'

export const timelineBar = (state: RowState) =>
  join(
    'absolute inset-y-0 min-w-1.5 rounded-full bg-cream',
    state === 'running' &&
      'animate-stripes bg-size-[22px_22px] bg-[repeating-linear-gradient(-45deg,var(--color-teal)_0_8px,color-mix(in_srgb,var(--color-teal)_55%,var(--color-cream))_8px_16px)] shadow-[0_0_14px_rgb(42_157_143/0.25)]',
    state === 'interrupted' &&
      'bg-[repeating-linear-gradient(-45deg,rgb(251_246_241/0.4)_0_3px,transparent_3px_7px)] shadow-[inset_0_0_0_1.5px_rgb(251_246_241/0.4)]',
    state === 'failed' && 'bg-coral',
  )

export const timelineOffset = 'text-right font-mono text-[13px] text-cream/60 tabular-nums max-[560px]:hidden'

export const timelineState = (state: RowState) =>
  join(
    'justify-self-stretch rounded-full px-0 py-1 text-center text-[13px] font-bold',
    state === 'landed' && 'bg-cream text-ink-deep',
    state === 'running' && 'bg-teal text-white',
    state === 'interrupted' && 'border border-white/8 bg-white/7 text-cream/60',
    state === 'failed' && 'bg-coral text-white',
  )
