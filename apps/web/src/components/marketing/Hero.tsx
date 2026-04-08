import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white px-6 pb-24 pt-20 text-center">
      {/* Background gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[600px] transform-gpu overflow-hidden blur-3xl"
      >
        <div
          className="relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-brand-200 to-brand-400 opacity-20"
          style={{ clipPath: 'ellipse(60% 50% at 50% 50%)' }}
        />
      </div>

      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
        Now with Web3 USDT payments
      </div>

      {/* Headline */}
      <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
        Tap. <span className="text-brand-500">Share.</span> Convert.
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed sm:text-xl">
        The digital business card that works with a single NFC tap or QR scan. Real-time analytics,
        built-in CRM, and on-chain payments — all in one link.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/auth"
          className="rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          Create your free card
        </Link>
        <Link
          href="/features"
          className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          See how it works
        </Link>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Free forever plan available &mdash; no credit card required
      </p>

      {/* Mock card preview */}
      <div className="mx-auto mt-16 max-w-xs">
        <div className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl">
          {/* Decorative NFC ring */}
          <div className="absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-brand-400 bg-white shadow-lg">
            <svg
              className="h-6 w-6 text-brand-500"
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
          <div className="mb-4 h-12 w-12 rounded-full bg-brand-500" />
          <p className="text-lg font-bold text-white">Alex Johnson</p>
          <p className="text-sm text-gray-400">Product Designer &bull; Acme Co.</p>
          <div className="mt-4 flex gap-2">
            {['Li', 'Tw', 'IG'].map((s) => (
              <span
                key={s}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white">
            dotly.one/<span className="font-semibold text-brand-400">alex</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">Tap or scan to share instantly</p>
      </div>
    </section>
  )
}
