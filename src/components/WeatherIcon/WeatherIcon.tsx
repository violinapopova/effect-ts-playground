import { skyOf } from '@/domain/weather'
import { sky as skyClass } from './styles'
import type { WeatherIconProps } from './props'

export const CLOUD = 'M16 50h32a11 11 0 0 0 1-22 15 15 0 0 0-29-3 12 12 0 0 0-4 25z'

const RAIN = 'stroke-[color-mix(in_srgb,var(--color-teal)_70%,var(--color-cream))] stroke-[3] [stroke-linecap:round]'

export function WeatherIcon({ code }: WeatherIconProps) {
  const sky = code === null ? null : skyOf(code)
  const hasSun = sky === 'clear' || sky === 'partly'
  const hasCloud = sky !== null && sky !== 'clear'
  return (
    <svg className={skyClass} viewBox="0 0 64 64" aria-hidden>
      {sky === null && (
        <circle className="fill-none stroke-white/16 stroke-[3] [stroke-dasharray:6_6]" cx="32" cy="32" r="18" />
      )}
      {hasSun && (
        <g
          className={sky === 'clear' ? 'origin-[32px_32px] animate-spin-slow' : undefined}
          transform={sky === 'partly' ? 'translate(-8 -8) scale(0.8)' : undefined}
        >
          <circle className="fill-coral" cx="32" cy="32" r="12" />
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              className="stroke-coral stroke-[3.5] [stroke-linecap:round]"
              x1="32"
              y1="10"
              x2="32"
              y2="15"
              transform={`rotate(${i * 45} 32 32)`}
            />
          ))}
        </g>
      )}
      {hasCloud && <path className="fill-cream/85 stroke-cream stroke-[1.5] [stroke-linejoin:round]" d={CLOUD} />}
      {sky === 'rain' && (
        <g className={RAIN}>
          <line x1="22" y1="54" x2="19" y2="61" />
          <line x1="32" y1="54" x2="29" y2="61" />
          <line x1="42" y1="54" x2="39" y2="61" />
        </g>
      )}
      {sky === 'snow' && (
        <g className="fill-cream">
          <circle cx="22" cy="57" r="2.2" />
          <circle cx="32" cy="59" r="2.2" />
          <circle cx="42" cy="57" r="2.2" />
        </g>
      )}
      {sky === 'fog' && (
        <g className={RAIN}>
          <line x1="14" y1="56" x2="50" y2="56" />
          <line x1="20" y1="61" x2="44" y2="61" />
        </g>
      )}
      {sky === 'storm' && <path className="fill-coral" d="M34 48l-7 9h6l-3 7 9-11h-6l3-5z" />}
    </svg>
  )
}
