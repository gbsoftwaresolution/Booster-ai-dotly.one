export function getServerApiUrl(): string {
  // MED-04: Server-side API calls must use a private/internal URL, never the
  // public browser-facing URL.  NEXT_PUBLIC_API_URL is intentionally excluded
  // from this fallback chain because:
  //   1. It routes traffic over the public internet, adding latency and egress cost.
  //   2. It exposes an unnecessary attack surface (public load balancer → API).
  // In production, set API_URL (or INTERNAL_API_URL) to the private network
  // address of the NestJS service (e.g. http://api:3001 in Docker / Railway).
  //
  const url = process.env.API_URL ?? process.env.INTERNAL_API_URL
  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3001'
    }
    throw new Error(
      'Neither API_URL nor INTERNAL_API_URL is set. ' +
        'Set API_URL to the private/internal address of the NestJS API service.',
    )
  }
  return url
}
