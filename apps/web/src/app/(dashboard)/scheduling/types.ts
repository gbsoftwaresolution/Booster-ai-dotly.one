import type { ItemsResponse } from '@dotly/types'

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface AvailabilityRule {
  id: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

export type BookingQuestionType = 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'SELECT' | 'CHECKBOX'

export interface BookingQuestion {
  id: string
  label: string
  type: BookingQuestionType
  options: string[]
  required: boolean
  position: number
}

export interface AppointmentType {
  id: string
  slug: string
  name: string
  description: string | null
  durationMins: number
  color: string
  bufferDays: number
  bufferAfterMins: number
  location: string | null
  isActive: boolean
  timezone: string
  depositEnabled?: boolean
  depositAmountUsdt?: string | null
  availabilityRules: AvailabilityRule[]
  questions: BookingQuestion[]
  _count: { bookings: number }
}

export interface SchedulingCardOption {
  id: string
  handle: string
  fields?: {
    bookingAppointmentSlug?: string
  }
}

export interface Booking {
  id: string
  startAt: string
  endAt: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'
  guestName: string
  guestEmail: string
  guestNotes: string | null
  appointmentType: { name: string; color: string; durationMins: number }
}

export type ConfirmState =
  | { type: 'appointment-type'; id: string }
  | { type: 'booking'; id: string }
  | { type: 'google-disconnect' }

export type GoogleStatusState =
  | { state: 'connected'; googleEmail?: string }
  | { state: 'disconnected' }
  | { state: 'unavailable'; message: string }

export type AppointmentTypesResponse = ItemsResponse<AppointmentType>
export type BookingsResponse = ItemsResponse<Booking>
