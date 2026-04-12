import type { SignatureStyle } from './signature-utils'

export const STYLES: { value: SignatureStyle; label: string; desc: string }[] = [
  { value: 'minimal', label: 'Minimal', desc: 'Clean, text-only' },
  { value: 'professional', label: 'Professional', desc: 'Photo + divider' },
  { value: 'branded', label: 'Branded', desc: 'Accent color + left border' },
]

export async function getToken(
  getAccessToken: () => Promise<string | null | undefined>,
): Promise<string | undefined> {
  return (await getAccessToken()) ?? undefined
}

export function encodeSvgData(svgData: string): string {
  const bytes = new TextEncoder().encode(svgData)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return window.btoa(binary)
}

export function getCopyToastText(copyToast: 'html' | 'gmail' | 'gmail-plain' | null): string {
  if (copyToast === 'html') return 'HTML copied to the clipboard.'
  if (copyToast === 'gmail') return 'Styled signature copied for Gmail.'
  if (copyToast === 'gmail-plain') {
    return 'Signature copied as plain text. Styled paste is not supported in this browser.'
  }
  return ''
}
