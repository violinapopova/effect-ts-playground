import { join } from '@/styles/ui'
import type { Status } from '@/components/types'

export const pillClass = (status: Status) =>
  join(
    'inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/7 px-3.5 py-1.5 text-sm font-semibold text-cream/60',
    status === 'loading' &&
      'border-teal/50 bg-teal/25 text-[color-mix(in_srgb,var(--color-teal)_60%,var(--color-cream))]',
    status === 'failed' && 'border-coral bg-coral text-white',
  )

export const pillDot = (status: Status) =>
  join(
    'size-2 rounded-full bg-cream/40',
    status === 'loading' && 'animate-pulse-ring bg-teal',
    status === 'failed' && 'bg-white',
  )
