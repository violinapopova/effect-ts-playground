import { join } from '@/styles/ui'

export const factClass = (alert = false) =>
  join('rounded-2xl border border-white/8 bg-black/18 px-3.5 py-2.5', alert && 'border-coral bg-coral text-white')

export const factLabel = (alert = false) =>
  join('text-xs font-semibold tracking-[0.08em] text-cream/60 uppercase', alert && 'text-white/80')

export const factValue = 'mt-1 text-base font-semibold'
