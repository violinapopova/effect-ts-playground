import { Segmented } from '@/components/Segmented/Segmented'
import type { ImplSwitchProps } from './props'

const IMPL_OPTIONS = [
  { value: 'useEffect', text: 'useEffect' },
  { value: 'Effect', text: 'Effect' },
] as const

export function ImplSwitch({ value, onChange }: ImplSwitchProps) {
  return <Segmented label="Implementation" options={IMPL_OPTIONS} value={value} onChange={onChange} />
}
