export function getServerApiUrl(): string {
  // MED-04: Server-side API calls must use a private/internal URL, never the
  // public browser-facing URL.  NEXT_PUBLIC_API_URL is intentionally excluded
  // from this fallback chain because:
  //   1. It routes traffic over the public internet, adding latency and egress cost.
  //   2. It exposes an unnecessary attack surface (public load balancer → API).
  // In production, set API_URL (or INTERNAL_API_URL) to the private network
  // address of the NestJS service (e.g. http://api:3001 in Docker / Railway).
  //
  // NOTE: We do NOT throw at module initialisation time because Next.js calls
  // getServerApiUrl() at the top level of route modules during `next build`
  // (page-data collection phase), which runs with NODE_ENV=production even on
  // local dev machines.  Instead, we log a warning and fall back to localhost so
  // the build succeeds; the missing-var error is surfaced at runtime by the
  // actual API fetch failing with ECONNREFUSED / 502.
  const url = process.env.API_URL ?? process.env.INTERNAL_API_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write(
        '[server-api] WARNING: Neither API_URL nor INTERNAL_API_URL is set. ' +
          'Server-side fetches will fall back to http://localhost:3001 which will ' +
          'NOT work in production. Set API_URL to the private/internal address of ' +
          'the NestJS API service.\n',
      )
    }
    return 'http://localhost:3001'
  }
  return url
}
