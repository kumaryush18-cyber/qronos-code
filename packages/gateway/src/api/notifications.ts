import { z } from "zod"
import { QRONOS_API_BASE } from "./constants.js"
import { getDefaultHeaders, buildQronosHeaders } from "../headers.js"

/**
 * Qronos notification schema
 */
export const QronosNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  action: z
    .object({
      actionText: z.string(),
      actionURL: z.string(),
    })
    .optional(),
  showIn: z.array(z.string()).optional(),
  suggestModelId: z.string().optional(),
})

export type QronosNotification = z.infer<typeof QronosNotificationSchema>

const NotificationsResponseSchema = z.object({
  notifications: z.array(QronosNotificationSchema),
})

const NOTIFICATIONS_TIMEOUT_MS = 5000

/**
 * Fetch notifications from Qronos API
 *
 * @param options - Configuration with token and optional organization ID
 * @returns Array of notifications from the Qronos API (clients filter by showIn)
 */
export async function fetchQronosNotifications(options: {
  qronosToken?: string
  qronosOrganizationId?: string
}): Promise<QronosNotification[]> {
  const token = options.qronosToken
  if (!token) return []

  const url = `${QRONOS_API_BASE}/api/users/notifications`

  try {
    const response = await fetch(url, {
      headers: {
        ...getDefaultHeaders(),
        ...buildQronosHeaders(undefined, { qronosOrganizationId: options.qronosOrganizationId }),
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(NOTIFICATIONS_TIMEOUT_MS),
    })

    if (!response.ok) return []

    const json = await response.json()
    const result = NotificationsResponseSchema.safeParse(json)

    if (!result.success) return []

    return result.data.notifications
  } catch {
    return []
  }
}
