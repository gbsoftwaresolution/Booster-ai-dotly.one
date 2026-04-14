import { ImageResponse } from 'next/og'
import { createPwaIconMarkup } from '@/lib/pwa-icon'

export const runtime = 'edge'

function clampSize(rawSize: string | null): number {
  const parsedSize = Number.parseInt(rawSize ?? '512', 10)

  if (!Number.isFinite(parsedSize)) {
    return 512
  }

  return Math.max(96, Math.min(parsedSize, 1024))
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const size = clampSize(searchParams.get('size'))
  const maskable = searchParams.get('maskable') === 'true'

  return new ImageResponse(createPwaIconMarkup(maskable), {
    width: size,
    height: size,
  })
}