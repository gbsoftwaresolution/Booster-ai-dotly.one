const STEPS = [
  {
    number: '01',
    title: 'Share your Dotly',
    description:
      'Open your public card with a QR code, link, or NFC tap so every real-world contact lands on one clear next step.',
  },
  {
    number: '02',
    title: 'Trigger an action',
    description:
      'Instead of browsing a profile, visitors can book, start a WhatsApp conversation, or leave their details in seconds.',
  },
  {
    number: '03',
    title: 'Track and convert',
    description:
      'Dotly captures intent, keeps the lead in your CRM, and helps you follow up before interest goes cold.',
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Revenue loop
          </p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
            From scan to follow-up in minutes
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.number} className="app-panel relative rounded-[28px] p-6">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-full top-1/2 hidden h-px w-full -translate-x-4 bg-gradient-to-r from-brand-200 to-transparent md:block"
                />
              )}

              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-200 bg-brand-50">
                <span className="text-sm font-extrabold text-brand-600">{step.number}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
