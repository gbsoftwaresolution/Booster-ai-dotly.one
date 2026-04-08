interface PoweredByDotlyProps {
  hideDotlyBranding?: boolean
}

export function PoweredByDotly({ hideDotlyBranding = false }: PoweredByDotlyProps) {
  if (hideDotlyBranding) return null

  return (
    <div className="flex justify-center py-5">
      <a
        href="https://dotly.one"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white/70 backdrop-blur-sm text-xs font-medium text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors shadow-sm"
        style={{ textDecoration: 'none' }}
      >
        {/* Dotly wordmark dot */}
        <span
          className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            boxShadow: '0 1px 4px rgba(14,165,233,0.4)',
          }}
        />
        Made with Dotly.one
      </a>
    </div>
  )
}
