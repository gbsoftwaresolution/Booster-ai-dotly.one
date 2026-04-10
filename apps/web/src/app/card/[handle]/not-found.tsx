import Link from 'next/link'

// ─── Global styles (all keyframes at module level per project convention) ─────
const GLOBAL_STYLES = `
  @keyframes nf-fade {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes nf-card {
    from { opacity: 0; transform: translateY(12px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }
`

export default function CardNotFound() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 100%)',
      }}
    >
      {/* Radial glow blob */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative flex flex-col items-center text-center"
        style={{ maxWidth: 360, animation: 'nf-fade 0.6s ease both' }}
      >
        <style>{GLOBAL_STYLES}</style>

        {/* Illustration — stylised card with broken link */}
        <div
          style={{
            marginBottom: 32,
            animation: 'nf-card 0.5s 0.1s cubic-bezier(.32,1.2,.56,1) both',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 28,
              background: 'white',
              boxShadow: '0 4px 24px rgba(14,165,233,.14), 0 1px 4px rgba(0,0,0,.06)',
            }}
          >
            {/* Card icon */}
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <circle cx="8.5" cy="10.5" r="2" />
              <path d="M14 10.5h3M14 13.5h3M2 8.5h20" />
            </svg>

            {/* Badge — "?" */}
            <div
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#f1f5f9',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#94a3b8',
                boxShadow: '0 2px 8px rgba(0,0,0,.08)',
              }}
            >
              ?
            </div>
          </div>
        </div>

        {/* Text hierarchy */}
        <p
          className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-2"
          style={{ animation: 'nf-fade 0.5s 0.15s ease both' }}
        >
          404 · Not Found
        </p>

        <h1
          className="text-[28px] font-extrabold tracking-tight text-slate-800 leading-tight mb-3"
          style={{ animation: 'nf-fade 0.5s 0.2s ease both' }}
        >
          Card not found
        </h1>

        <p
          className="text-sm text-slate-400 leading-relaxed mb-8 max-w-[280px]"
          style={{ animation: 'nf-fade 0.5s 0.25s ease both' }}
        >
          This card doesn&apos;t exist or has been unpublished by its owner.
        </p>

        {/* CTA */}
        <div style={{ animation: 'nf-fade 0.5s 0.35s ease both' }}>
          <Link
            href="https://dotly.one"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:bg-sky-600 hover:shadow-sky-500/35 active:scale-95"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <circle cx="8.5" cy="12" r="2" />
              <path d="M14 10h4M14 14h4" />
            </svg>
            Create your own card
          </Link>
        </div>
      </div>

      {/* Branding */}
      <p
        className="absolute bottom-8 text-xs text-slate-300"
        style={{ animation: 'nf-fade 0.5s 0.5s ease both' }}
      >
        Powered by{' '}
        <a href="https://dotly.one" className="font-semibold text-sky-400 hover:underline">
          Dotly.one
        </a>
      </p>
    </main>
  )
}
