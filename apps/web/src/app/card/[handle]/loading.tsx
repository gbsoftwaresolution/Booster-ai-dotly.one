// ─── Global styles (all keyframes at module level per project convention) ─────
const GLOBAL_STYLES = `
  @keyframes card-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '800px 100%',
  animation: 'card-shimmer 1.4s ease infinite',
  borderRadius: 10,
}

export default function CardLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      <div
        style={{
          width: '100%',
          maxWidth: 448,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Hero / cover area */}
        <div
          style={{
            height: 200,
            ...shimmer,
            borderRadius: 0,
          }}
        />

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -44, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              border: '4px solid white',
              ...shimmer,
            }}
          />
        </div>

        {/* Name + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 24px 0' }}>
          <div style={{ width: 180, height: 22, ...shimmer }} />
          <div style={{ width: 130, height: 16, ...shimmer }} />
          <div style={{ width: 100, height: 14, ...shimmer }} />
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '24px 20px 0' }}>
          <div style={{ flex: 1, height: 48, borderRadius: 14, ...shimmer }} />
          <div style={{ flex: 1, height: 48, borderRadius: 14, ...shimmer }} />
        </div>

        {/* Contact info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px 20px 0' }}>
          {[160, 140, 120].map((w) => (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, ...shimmer }} />
              <div style={{ width: w, height: 14, ...shimmer }} />
            </div>
          ))}
        </div>

        {/* Social links row */}
        <div style={{ display: 'flex', gap: 10, padding: '24px 20px 0', justifyContent: 'center' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: 12, ...shimmer }} />
          ))}
        </div>

        {/* ShareBar placeholder */}
        <div style={{ marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid rgba(148,163,184,.12)', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 44, borderRadius: 12, ...shimmer }} />
          <div style={{ width: 44, height: 44, borderRadius: 10, ...shimmer }} />
          <div style={{ width: 80, height: 44, borderRadius: 10, ...shimmer }} />
        </div>
      </div>
    </main>
  )
}
