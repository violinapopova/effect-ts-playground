import { join } from '@/styles/ui'

export const toastStack =
  'pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-5 flex w-[min(520px,calc(100%-32px))] -translate-x-1/2 flex-col items-center gap-2'

export const toastClass = (stale: boolean) =>
  join(
    'animate-toast m-0 rounded-[14px] px-[18px] py-3 text-[15px] font-semibold shadow-[0_12px_30px_rgb(0_0_0/0.4)]',
    stale ? 'bg-coral text-white' : 'bg-cream text-ink-deep',
  )
