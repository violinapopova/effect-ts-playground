/** The two drifting colour blobs behind the page. Place inside a `relative` container. */
export function Backdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute top-[120px] left-[calc(50%-460px)] z-0 size-[460px] animate-drift rounded-full bg-teal/55 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[380px] left-[calc(50%+60px)] z-0 size-[400px] animate-drift rounded-full bg-coral/45 blur-[90px] [animation-delay:-9s]"
        aria-hidden
      />
    </>
  )
}
