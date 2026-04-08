const TESTIMONIALS = [
  {
    quote:
      'I replaced my paper cards at a conference and got 3 client inquiries the same day — all tracked in the CRM automatically.',
    name: 'Sarah K.',
    title: 'Freelance UX Designer',
    initials: 'SK',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    quote:
      'Our 12-person sales team switched to Dotly.one Business. The custom domain and team analytics alone paid for the subscription in the first week.',
    name: 'Marcus T.',
    title: 'VP of Sales, NovaTech',
    initials: 'MT',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    quote:
      'The USDT payment feature is a game-changer for international clients. Zero bank fees, instant settlement, no chargebacks.',
    name: 'Priya L.',
    title: 'Digital Marketing Consultant',
    initials: 'PL',
    color: 'bg-emerald-100 text-emerald-700',
  },
]

export function Testimonials() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            What people say
          </p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
            Loved by professionals worldwide
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <blockquote className="flex-1 text-sm leading-relaxed text-gray-600">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${t.color}`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
