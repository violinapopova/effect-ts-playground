// Shared style helpers. Component classes live next to their component, in `<Name>/styles.ts`.

export const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

export const glassSurface =
  'relative bg-[linear-gradient(145deg,rgb(255_255_255/0.11),rgb(255_255_255/0.07))] backdrop-blur-[28px] backdrop-saturate-150 rounded-[28px]'

export const glassShadow =
  'border border-white/16 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_30px_60px_-20px_rgb(0_0_0/0.55)]'

export const glass = `${glassSurface} ${glassShadow}`

/** A quiet outlined button, e.g. "Reset server" and "Back to cities". */
export const ghost =
  'cursor-pointer rounded-[10px] border border-white/16 bg-transparent px-3.5 py-2 font-sans text-sm font-semibold text-cream/60 hover:border-cream/40 hover:text-cream'
