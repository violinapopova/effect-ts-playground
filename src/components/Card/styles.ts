import { glassShadow, glassSurface, join } from '@/styles/ui'
import type { CardImpl } from '@/components/types'

const cardChrome =
  "overflow-hidden px-6 pt-[22px] pb-5 transition-[border-color,box-shadow] duration-300 max-[560px]:px-4 max-[560px]:py-[18px] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']"

export const cardClass = (impl: CardImpl, stale = false) =>
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

export const cardHead = (stale = false) => join('mb-4 flex items-start justify-between gap-4', stale && 'pr-16')

export const cardTitle = (impl: CardImpl) =>
  join(
    'm-0 font-mono text-2xl font-bold tracking-[-0.02em]',
    impl !== 'useEffect' && 'text-[color-mix(in_srgb,var(--color-teal)_55%,var(--color-cream))]',
  )
