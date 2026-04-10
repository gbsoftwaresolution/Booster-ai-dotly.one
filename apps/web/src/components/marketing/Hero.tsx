import Link from 'next/link'

export function Hero() {
  return (
    <section className="marketing-shell relative overflow-hidden px-6 pb-24 pt-16 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-44 -z-10 h-[640px] transform-gpu overflow-hidden blur-3xl"
      >
        <div
          className="relative left-1/2 aspect-[1155/678] w-[40rem] -translate-x-1/2 bg-gradient-to-tr from-sky-200 via-cyan-300 to-indigo-300 opacity-30"
          style={{ clipPath: 'ellipse(60% 50% at 50% 50%)' }}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto hidden h-[520px] max-w-6xl rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.95),rgba(255,255,255,0))] lg:block"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,460px)] lg:gap-18">
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/85 px-4 py-2 text-xs font-semibold text-sky-700 shadow-[0_18px_40px_-24px_rgba(14,165,233,0.45)] backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
            Now with Web3 USDT payments
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-[-0.04em] text-gray-950 sm:text-6xl lg:mx-0 lg:text-7xl xl:text-[5.3rem]">
            Tap once.
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Look unforgettable.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl lg:mx-0">
            A digital business card platform that feels premium from the first tap. Share faster,
            capture warmer leads, and run follow-up from one polished workspace.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/auth"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_24px_45px_-22px_rgba(14,165,233,0.7)] hover:-translate-y-0.5"
            >
              Create your free card
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/80 bg-white/85 px-8 py-3.5 text-base font-semibold text-gray-700 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white"
            >
              See how it works
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 lg:justify-start">
            <span className="app-panel-subtle rounded-full px-3 py-1.5">Free forever plan</span>
            <span className="app-panel-subtle rounded-full px-3 py-1.5">
              No credit card required
            </span>
            <span className="app-panel-subtle rounded-full px-3 py-1.5">NFC and QR ready</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="app-shell-surface absolute -left-6 top-10 hidden rounded-[28px] px-4 py-3 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
              Lead Capture
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">+42% more warm intros</p>
          </div>

          <div className="app-shell-surface absolute -right-2 bottom-10 rounded-[26px] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
              Analytics
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              Views, taps and saves in real time
            </p>
          </div>

          <div className="app-shell-surface relative rounded-[32px] p-3">
            <div className="relative overflow-hidden rounded-[28px] border border-gray-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 p-6 shadow-2xl sm:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.35),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.28),transparent_32%)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">
                    Digital Card
                  </p>
                  <p className="mt-4 text-2xl font-bold text-white">Alex Johnson</p>
                  <p className="mt-1 text-sm text-slate-300">Product Designer at Acme Co.</p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-sky-300/60 bg-white shadow-lg">
                  <svg
                    className="h-6 w-6 text-sky-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                    />
                  </svg>
                </div>
              </div>

              <div className="relative mt-8 rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">dotly.one/alex</p>
                    <p className="text-xs text-slate-300">Tap or scan to share instantly</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {['LinkedIn', 'X', 'Instagram'].map((s) => (
                    <span
                      key={s}
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Views
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">12.4k</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Saved Contacts
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">1.1k</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
