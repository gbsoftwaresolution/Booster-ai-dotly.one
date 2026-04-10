const STEPS = [
  {
    number: '01',
    title: 'Create your card',
    description:
      'Sign up free, pick a username, and fill in your details: name, title, photo, social links, portfolio blocks. Takes under 5 minutes.',
  },
  {
    number: '02',
    title: 'Share with a tap or scan',
    description:
      'Write your card to an NFC tag or print your QR code. Anyone with a phone can view your full profile — no app needed.',
  },
  {
    number: '03',
    title: 'Capture leads & close deals',
    description:
      'Every scan creates a contact in your CRM. Follow up, track engagement in real time, and accept USDT payments on the spot.',
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Simple by design
          </p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
            Up and running in minutes
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
