import { ImageResponse } from 'next/og'
import { createPwaIconMarkup } from '@/lib/pwa-icon'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon(): ImageResponse {
  return new ImageResponse(createPwaIconMarkup(false), size)
}