import { join } from '@/styles/ui'

export const segmented =
  'm-0 inline-flex min-w-0 flex-wrap gap-1 rounded-[14px] border border-white/8 bg-white/7 p-1 backdrop-blur-[20px]'

export const segmentButton = (pressed: boolean) =>
  join(
    'cursor-pointer rounded-[10px] border-0 px-3.5 py-2 font-sans text-sm font-semibold',
    pressed ? 'bg-cream text-ink-deep' : 'bg-transparent text-cream/60 hover:text-cream',
  )
