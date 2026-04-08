const STATS = [
  { value: '50K+', label: 'Cards created' },
  { value: '2.4M+', label: 'NFC taps & scans' },
  { value: '180+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime SLA' },
]

const LOGOS = [
  'Acme Corp',
  'Veritas Labs',
  'Nova Studio',
  'Meridian Group',
  'Apex Digital',
  'Summit Works',
]

export function SocialProof() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-extrabold text-brand-500">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trusted by */}
        <div className="mt-14 text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-400 shadow-sm"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
