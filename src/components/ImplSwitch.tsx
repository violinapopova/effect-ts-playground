import { Segmented } from './Segmented'
import type { Impl } from './types'

const IMPL_OPTIONS = [
  { value: 'useEffect', text: 'useEffect' },
  { value: 'Effect', text: 'Effect' },
] as const

export function ImplSwitch({ value, onChange }: { readonly value: Impl; readonly onChange: (impl: Impl) => void }) {
  return <Segmented label="Implementation" options={IMPL_OPTIONS} value={value} onChange={onChange} />
}
