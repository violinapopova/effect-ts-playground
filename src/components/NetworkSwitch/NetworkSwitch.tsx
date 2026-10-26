import { useSyncExternalStore } from 'react'
import { type NetworkMode, getNetworkMode, recordedAt, setNetworkMode, subscribeNetworkMode } from '@/api/weather'
import { Segmented } from '@/components/Segmented/Segmented'

const NETWORK_OPTIONS = [
  { value: 'live', text: 'Live API' },
  { value: 'offline', text: 'Offline' },
] as const

/** Live API or the offline recording, for the whole app. */
export function NetworkSwitch() {
  const mode = useSyncExternalStore(subscribeNetworkMode, getNetworkMode)
  const recorded = new Date(recordedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return (
    <div className="flex flex-col items-end gap-1.5 max-[560px]:items-start">
      <Segmented<NetworkMode> label="Network" options={NETWORK_OPTIONS} value={mode} onChange={setNetworkMode} />
      <span className="text-xs text-cream/40">
        {mode === 'offline' ? `Recorded responses from ${recorded}, same timings` : 'Real requests to Open-Meteo'}
      </span>
    </div>
  )
}
