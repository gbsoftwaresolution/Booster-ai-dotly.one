const fs = require('fs')
const p = 'apps/web/src/components/marketing/Hero.tsx'

const newHero = `import Link from 'next/link'
import { cn } from '@/lib/cn'

function HeroDesktop() {
  return (
    <div className="hidden lg:grid mx-auto max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,460px)] lg:gap-18 relative z-10">
      <div className="text-left">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/85 px-4 py-2 text-xs font-semibold text-sky-700 shadow-[0_18px_40px_-24px_rgba(14,165,233,0.45)] backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
          Now with Web3 USDT payments
        </div>

        <h1 className="mx-0 max-w-4xl text-7xl xl:text-[5.3rem] font-extrabold tracking-[-0.04em] text-gray-950">
          Tap once.
          <br />
          <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
            Look unforgettable.
          </span>
        </h1>

        <p className="mx-0 mt-6 max-w-2xl text-xl leading-8 text-gray-600">
          A digital business card platform that feels premium from the first tap. Share faster,
          capture warmer leads, and run follow-up from one polished workspace.
        </p>

        <div className="mt-10 flex flex-row items-center justify-start gap-4">
          <Link
            href="/auth"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-400 to-indigo-500 px-8 py-3.5 text-base font-bold text-white shadow-[0_24px_45px_-22px_rgba(14,165,233,0.7)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_50px_-20px_rgba(14,165,233,0.8)]"
          >
            Create your free card
          </Link>
          <Link
            href="/features"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-slate-200/60 bg-white/50 px-8 py-3.5 text-base font-bold text-slate-700 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/80 hover:bg-white hover:text-slate-900 hover:shadow-[0_12px_24px_-8px_rgba(15,23,42,0.15)]"
          >
            See how it works
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-start gap-3 text-sm text-gray-500">
          <span className="rounded-full border border-sky-100 bg-sky-50/50 px-4 py-1.5 font-medium text-sky-800">Free forever plan</span>
          <span className="rounded-full border border-sky-100 bg-sky-50/50 px-4 py-1.5 font-medium text-sky-800">No credit card required</span>
          <span className="rounded-full border border-sky-100 bg-sky-50/50 px-4 py-1.5 font-medium text-sky-800">NFC and QR ready</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[460px]">
        <div className="absolute -left-12 top-20 z-20 rounded-[28px] border border-white/80 bg-white/60 p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl transition-transform hover:-translate-y-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-emerald-500">Lead Capture</p>
          <p className="mt-1 text-sm font-bold text-slate-800">+42% more warm intros</p>
        </div>

        <div className="absolute -right-8 bottom-20 z-20 rounded-[26px] border border-white/80 bg-white/60 p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl transition-transform hover:-translate-y-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sky-500">Analytics</p>
          <p className="mt-1 text-sm font-bold text-slate-800">Views, taps & saves live</p>
        </div>

        <div className="relative rounded-[40px] border border-white/60 bg-white/30 p-4 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-7 py-8 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.25),transparent_40%)]" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-300/80">Digital Card</p>
                <p className="mt-5 text-3xl font-bold text-white tracking-tight">Alex Johnson</p>
                <p className="mt-1.5 text-[15px] font-medium text-sky-100/70">Lead Designer at Dotly</p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 shadow-[0_0_24px_rgba(56,189,248,0.4)]">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-slate-900">
                  <span className="text-xl font-bold text-white">AJ</span>
                </div>
              </div>
            </div>

            <div className="relative mt-10 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <div className="h-6 w-6 rounded border-2 border-white/60" />
                </div>
                <div>
                  <p className="text-[15px] font-bold tracking-tight text-white">dotly.one/alex</p>
                  <p className="text-[12px] font-medium text-slate-400">Tap or scan to share</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {['LinkedIn', 'X', 'Instagram'].map((s) => (
                  <span key={s} className="rounded-[16px] border border-white/10 bg-white/5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroMobile() {
  return (
    <div className="flex flex-col lg:hidden relative z-10 w-full px-2">
      <div className="text-center flex flex-col items-center">
        <div className="mb-8 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-sky-300/60 bg-sky-50/80 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-sky-600 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.3)] backdrop-blur-xl">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500"></span>
          </span>
          Next Gen Cards
        </div>

        <h1 className="max-w-[12em] text-[13vw] leading-[1.05] sm:text-6xl font-black tracking-tighter text-slate-900 drop-shadow-sm">
          Tap once.
          <br />
          <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Stand out.
          </span>
        </h1>

        <p className="mt-6 max-w-[20em] text-[17px] font-medium leading-relaxed text-slate-500 px-4">
          A digital business card that feels strictly premium. Share faster and capture warmer leads instantly.
        </p>

        <div className="mt-10 w-full px-6 flex flex-col gap-3">
          <Link
            href="/auth"
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-r from-sky-400 to-indigo-500 px-8 py-5 text-[17px] font-bold text-white shadow-[0_16px_32px_-12px_rgba(79,70,229,0.5)] transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            Create your free card
          </Link>
          <Link
            href="/features"
            className="flex w-full items-center justify-center rounded-[24px] border-2 border-slate-200/80 bg-white/60 px-8 py-5 text-[17px] font-bold text-slate-600 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all hover:bg-white hover:text-slate-900 active:scale-95"
          >
            See how it works
          </Link>
        </div>
      </div>

      {/* Floating Wow Card Section */}
      <div className="relative mx-auto mt-16 w-full max-w-[340px] perspective-[1200px]">
        {/* Decorative background glows specific to mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-sky-400/20 blur-[50px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-indigo-500/20 blur-[40px] pointer-events-none translate-x-4" />

        <div className="relative z-10 transform-gpu rotate-y-[-5deg] rotate-x-[5deg] rounded-[38px] border-[1.5px] border-white/80 bg-white/40 p-3 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.15),0_0_0_1px_rgba(255,255,255,0.5)_inset] backdrop-blur-2xl">
          {/* Inner Screen */}
          <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.25),transparent_60%)]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[30px]" />
            
            <div className="relative pt-2">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_8px_24px_-8px_rgba(56,189,248,0.5)]">
                <span className="text-xl font-bold text-white">AJ</span>
              </div>
              <h3 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">Alex Johnson</h3>
              <p className="text-center text-[13px] font-medium text-slate-400 mt-1">Lead Designer @ Dotly</p>

              <div className="mt-8 flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-[20px] bg-white/10 p-4 backdrop-blur-md border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[14px] bg-indigo-500/20 flex items-center justify-center text-indigo-400 line-clamp-1">in</div>
                    <span className="text-[14px] font-bold text-white">LinkedIn</span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white/10" />
                </div>
                <div className="flex items-center justify-between rounded-[20px] bg-white/10 p-4 backdrop-blur-md border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[14px] bg-sky-500/20 flex items-center justify-center text-sky-400 line-clamp-1">𝕏</div>
                    <span className="text-[14px] font-bold text-white">Twitter / X</span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white/10" />
                </div>
              </div>

              <div className="mt-6 flex gap-3 pb-2">
                 <button className="flex-1 rounded-[18px] bg-white text-slate-900 py-3.5 text-[14px] font-bold tracking-wide shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]">
                   Save Contact
                 </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute -left-6 top-24 z-20 animate-float rounded-[20px] border border-white/60 bg-white/70 p-3 shadow-[0_16px_32px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">New Lead</p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-800">Captured ✨</p>
        </div>
        <div className="absolute -right-4 bottom-24 z-20 animate-float-delayed rounded-[20px] border border-white/60 bg-white/70 p-3 shadow-[0_16px_32px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-500">Analytics</p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-800">2.4k Views</p>
        </div>

      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden w-full px-4 pb-28 pt-16 sm:pt-24 min-h-[90vh] flex flex-col justify-center">
      {/* Background glow for both */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[800px] transform-gpu overflow-hidden blur-[80px]"
      >
        <div
          className="relative left-1/2 aspect-[1155/678] w-[50rem] -translate-x-1/2 bg-gradient-to-tr from-sky-200 via-indigo-100 to-cyan-100 opacity-40 sm:opacity-50"
          style={{ clipPath: 'ellipse(60% 50% at 50% 50%)' }}
        />
      </div>

      <HeroDesktop />
      <HeroMobile />
    </section>
  )
}
`

fs.writeFileSync(p, newHero, 'utf8')
