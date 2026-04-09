import { IsDateString } from 'class-validator'

export class RescheduleBookingDto {
  /** ISO-8601 datetime string for the new slot start, e.g. "2026-04-10T09:00:00.000Z" */
  @IsDateString()
  startAt!: string
}
