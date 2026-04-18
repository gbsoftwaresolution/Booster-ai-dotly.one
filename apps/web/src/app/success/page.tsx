export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const params = await searchParams
  const mode = params.mode

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#ffffff_100%)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <section className="w-full rounded-[32px] border border-white/70 bg-white/90 p-6 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
            {mode === 'cod' ? 'Order Requested' : 'Payment Successful'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Thank you</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {mode === 'cod'
              ? 'Your cash on delivery request has been sent. The seller can confirm collection from their dashboard.'
              : 'Your payment has been received successfully.'}
          </p>
        </section>
      </div>
    </main>
  )
}
