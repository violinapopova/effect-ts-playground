import { CLOUD } from '@/components/WeatherIcon/WeatherIcon'

/** The SkySwitch logo, title and tagline. */
export function Header() {
  return (
    <header className="relative z-1 mx-auto mb-10 flex items-center justify-center gap-[18px]">
      <svg className="size-[60px] shrink-0 drop-shadow-[0_6px_18px_rgb(0_0_0/0.4)]" viewBox="0 0 64 64" aria-hidden>
        <circle className="fill-coral" cx="40" cy="22" r="12" />
        <path className="fill-cream" d={CLOUD} />
      </svg>
      <div>
        <h1 className="m-0 text-[clamp(36px,5vw,54px)] leading-none font-extrabold tracking-[-0.035em]">
          Sky<span className="text-coral">Switch</span>
        </h1>
        <p className="mt-2 text-[clamp(15px,1.8vw,19px)] text-cream/60">An Effect playground for async races</p>
      </div>
    </header>
  )
}
