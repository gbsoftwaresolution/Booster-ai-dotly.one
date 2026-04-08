'use client'

import { useEffect, useState } from 'react'

export default function CardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    console.error('[card/error]', error)
  }, [error])

  function handleReset() {
    setRetrying(true)
    // Give the spinner a brief moment before reset triggers re-render
    setTimeout(() => {
      reset()
      setRetrying(false)
    }, 400)
  }

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background: 'linear-gradient(160deg, #fff1f2 0%, #fef2f2 40%, #f8fafc 100%)',
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
          background: 'radial-gradient(circle, rgba(239,68,68,.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative flex flex-col items-center text-center"
        style={{ maxWidth: 360, animation: 'err-fade 0.6s ease both' }}
      >
        <style>{`
          @keyframes err-fade {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: none; }
          }
          @keyframes err-icon {
            from { opacity: 0; transform: translateY(12px) scale(.96); }
            to   { opacity: 1; transform: none; }
          }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>

        {/* Icon */}
        <div
          style={{
            marginBottom: 32,
            animation: 'err-icon 0.5s 0.1s cubic-bezier(.32,1.2,.56,1) both',
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
              boxShadow: '0 4px 24px rgba(239,68,68,.12), 0 1px 4px rgba(0,0,0,.06)',
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Text hierarchy */}
        <p
          className="text-[11px] font-semibold uppercase tracking-widest text-red-400 mb-2"
          style={{ animation: 'err-fade 0.5s 0.15s ease both' }}
        >
          Error · Something went wrong
        </p>

        <h1
          className="text-[28px] font-extrabold tracking-tight text-slate-800 leading-tight mb-3"
          style={{ animation: 'err-fade 0.5s 0.2s ease both' }}
        >
          Couldn&apos;t load this card
        </h1>

        <p
          className="text-sm text-slate-400 leading-relaxed mb-8 max-w-[280px]"
          style={{ animation: 'err-fade 0.5s 0.25s ease both' }}
        >
          There was a problem loading this card. Please try again in a moment.
        </p>

        {/* CTA */}
        <div style={{ animation: 'err-fade 0.5s 0.35s ease both' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-700 hover:shadow-slate-800/30 active:scale-95 disabled:opacity-70"
          >
            {retrying ? (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: 'spin .75s linear infinite' }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Retrying…
              </>
            ) : (
              <>
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
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                </svg>
                Try again
              </>
            )}
          </button>
        </div>
      </div>

      {/* Branding */}
      <p
        className="absolute bottom-8 text-xs text-slate-300"
        style={{ animation: 'err-fade 0.5s 0.5s ease both' }}
      >
        Powered by{' '}
        <a href="https://dotly.one" className="font-semibold text-sky-400 hover:underline">
          Dotly.one
        </a>
      </p>
    </main>
  )
}
