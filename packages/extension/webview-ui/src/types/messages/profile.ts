// Qronos notification types (mirrored from qronos-gateway)
export interface QronosNotificationAction {
  actionText: string
  actionURL: string
}

export interface QronosNotification {
  id: string
  title: string
  message: string
  action?: QronosNotificationAction
  showIn?: string[]
  suggestModelId?: string
}

// Profile types from qronos-gateway
export interface QronosBalance {
  balance: number
}

export interface QronosPassState {
  currentPeriodBaseCreditsUsd: number
  currentPeriodUsageUsd: number
  currentPeriodBonusCreditsUsd: number
  nextBillingAt?: string | null
}

export interface ProfileData {
  profile: {
    email: string
    name?: string
    organizations?: Array<{ id: string; name: string; role: string }>
    selectedOrganizationId?: string
    hasPersonalAccount?: boolean
  }
  balance: QronosBalance | null
  qronosPass: QronosPassState | null
  currentOrgId: string | null
}
