import { apiGet } from '@/lib/api'
import type { ItemsResponse, UserMeResponse } from '@dotly/types'

export interface OnboardingState {
  profileComplete: boolean
  hasCard: boolean
}

export interface MinimalCardSummary {
  id: string
}

export async function getOnboardingState(token: string): Promise<OnboardingState> {
  const user = await apiGet<UserMeResponse | null>('/users/me', token)
  if (!user) {
    return {
      profileComplete: false,
      hasCard: false,
    }
  }

  const cards = await apiGet<ItemsResponse<MinimalCardSummary>>('/cards', token)

  const profileComplete = Boolean(user.name?.trim()) && Boolean(user.country?.trim())
  const hasCard = (cards.items?.length ?? 0) > 0

  return {
    profileComplete,
    hasCard,
  }
}

export function getOnboardingNextStep(state: OnboardingState): 'profile' | 'card' | null {
  if (!state.profileComplete) return 'profile'
  if (!state.hasCard) return 'card'
  return null
}
