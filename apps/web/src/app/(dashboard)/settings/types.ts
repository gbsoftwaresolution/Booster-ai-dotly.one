export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  hint?: string
}

export interface SubscriptionSummary {
  boosterAiPartnerId?: string | null
}

export const tabs = ['Profile', 'Billing', 'Notifications'] as const

export type Tab = (typeof tabs)[number]

export interface NotifPrefs {
  leadCaptured: boolean
  weeklyDigest: boolean
  productUpdates: boolean
}

export type ProfileFieldKey = 'name' | 'country' | 'timezone'

export type ProfileFieldErrors = Partial<Record<ProfileFieldKey, string>>
