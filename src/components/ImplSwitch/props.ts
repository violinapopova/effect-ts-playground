import type { Impl } from '@/components/types'

export interface ImplSwitchProps {
  readonly value: Impl
  readonly onChange: (impl: Impl) => void
}
