import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="app-panel w-full rounded-[32px] p-8 sm:p-10">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
          Offline mode
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          You’re offline right now.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Dotly.one can still show the cached marketing pages you visited recently. Reconnect to use
          live card data, CRM updates, and scheduling actions.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-400 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-[0_24px_45px_-22px_rgba(14,165,233,0.7)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_50px_-20px_rgba(14,165,233,0.8)]"
          >
            Go to home
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-6 py-3 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:text-slate-950"
          >
            View pricing
          </Link>
        </div>
      </section>
    </main>
  )
}