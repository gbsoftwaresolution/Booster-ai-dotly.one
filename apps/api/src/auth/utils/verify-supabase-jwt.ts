import { createHmac, createPublicKey, createVerify } from 'crypto'

function toDerInteger(raw: Buffer): Buffer {
  let value = raw
  while (value.length > 1 && value[0] === 0 && (value[1] ?? 0) < 0x80) {
    value = value.subarray(1)
  }
  if ((value[0] ?? 0) >= 0x80) {
    value = Buffer.concat([Buffer.from([0]), value])
  }
  return Buffer.concat([Buffer.from([0x02, value.length]), value])
}

function joseToDerSignature(signature: Buffer): Buffer {
  if (signature.length !== 64) return signature
  const r = toDerInteger(signature.subarray(0, 32))
  const s = toDerInteger(signature.subarray(32, 64))
  const sequence = Buffer.concat([r, s])
  return Buffer.concat([Buffer.from([0x30, sequence.length]), sequence])
}

export function verifySupabaseJwt(token: string, secret: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts as [string, string, string]
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString()) as { alg?: string }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      sub?: string
      exp?: number
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    const signingInput = `${headerB64}.${payloadB64}`
    const sig = Buffer.from(sigB64, 'base64url')

    let valid = false
    try {
      const jwk = JSON.parse(secret) as Record<string, unknown>
      if (jwk['kty'] === 'EC' && header.alg === 'ES256') {
        const pubKey = createPublicKey({ key: jwk, format: 'jwk' })
        const verify = createVerify('SHA256')
        verify.update(signingInput)
        valid = verify.verify(pubKey, joseToDerSignature(sig))
      } else if (header.alg === 'HS256') {
        const mac = createHmac('sha256', secret).update(signingInput).digest()
        valid = mac.length === sig.length && mac.equals(sig)
      }
    } catch {
      if (header.alg === 'HS256') {
        const mac = createHmac('sha256', secret).update(signingInput).digest()
        valid = mac.length === sig.length && mac.equals(sig)
      }
    }

    return valid ? (payload.sub ?? null) : null
  } catch {
    return null
  }
}
