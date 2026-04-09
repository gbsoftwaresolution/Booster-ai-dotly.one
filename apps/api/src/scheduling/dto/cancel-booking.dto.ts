import { IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CancelBookingDto {
  /** Optional free-text reason for cancellation (shown to the owner/guest). */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  // MED-1: DB column is VARCHAR(500) — MaxLength must match to prevent truncation errors.
  @MaxLength(500)
  reason?: string
}
