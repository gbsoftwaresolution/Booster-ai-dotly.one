import Link from 'next/link'

export function CtaBanner() {
  return (
    <section className="border-t border-gray-100 bg-gradient-to-br from-brand-500 to-brand-600 px-6 py-20 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Ready to ditch paper cards?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-brand-100 leading-relaxed">
          Join thousands of professionals sharing smarter. Your free card is waiting — no credit
          card, no commitment.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth"
            className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-600 shadow-md transition-colors hover:bg-brand-50"
          >
            Create your free card
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-brand-300 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-400"
          >
            View pricing
          </Link>
        </div>
        <p className="mt-4 text-xs text-brand-200">
          Free plan available forever &mdash; upgrade any time
        </p>
      </div>
    </section>
  )
}
