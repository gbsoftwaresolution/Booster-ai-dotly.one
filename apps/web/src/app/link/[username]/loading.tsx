export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#ffffff_100%)] px-4 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center sm:min-h-[calc(100vh-3rem)]">
        <section className="w-full rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-5 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-2 h-5 w-5/6 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-8 space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-emerald-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </section>
      </div>
    </main>
  )
}
