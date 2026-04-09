import { IsString, IsEmail, IsOptional, IsDateString, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateBookingDto {
  @IsString()
  // MED-6: Trim leading/trailing whitespace and enforce non-empty after trimming
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  guestName!: string

  @IsEmail()
  // MED-6: RFC 5321 max local-part (64) + @ + max domain (253) = 318, but
  // practical limit is 254 per RFC 5321 §4.5.3.1.3
  // FIX-9: Trim whitespace so "user@example.com " doesn't fail IsEmail validation
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(254)
  guestEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  guestNotes?: string

  /** ISO-8601 datetime string for the chosen slot start, e.g. "2026-04-10T09:00:00.000Z" */
  @IsDateString()
  startAt!: string
}
