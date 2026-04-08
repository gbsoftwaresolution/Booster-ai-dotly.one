import { IsString, IsIn, MaxLength } from 'class-validator'

// LOW-10 / HIGH-06: Align the @MaxLength cap with the 8MB body limit.
// 8 MB of raw binary = ~10.67 MB base64.  The body cap in main.ts is 8 MB,
// which is measured on the raw HTTP body (the JSON envelope + base64 string).
// A 5 MB binary image → ~6.7 MB base64 → ~6.8 MB JSON body (well under 8 MB).
// Cap at 7_000_000 chars (~5.25 MB binary) to leave headroom for the JSON envelope.
// Previously set to 10_000_000 which could exceed the 8 MB body limit if the
// JSON framing pushed it over — misleading to callers and inconsistent with
// the actual enforced limit.
const MAX_BASE64_LENGTH = 7_000_000

export class ScanCardDto {
  @IsString()
  @MaxLength(MAX_BASE64_LENGTH)
  base64Image!: string

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  mimeType!: string
}
