/**
 * Authentication handlers — extracted from KiloProvider.
 *
 * Manages login (device auth flow), logout, organization switching,
 * and profile refresh.
 */

import * as vscode from "vscode"
import type { KiloClient } from "@qronos-ai/sdk/v2/client"
import { getErrorMessage } from "../../kilo-provider-utils"
import { QronosAuthService } from "../../services/qronos-auth-service"

export interface AuthContext {
  readonly client: KiloClient | null
  postMessage(msg: unknown): void
  getWorkspaceDirectory(): string
  disposeGlobal(): Promise<void>
  invalidateProviderUsage(): void
  invalidateProviders(): void
  fetchAndSendProviders(): Promise<void>
  fetchAndSendAgents(): Promise<void>
  fetchAndSendSpeechToTextModels(): Promise<void>
}

/**
 * Handle login via Qronos AI GitHub Device Flow.
 * Sends device auth messages so the webview can display code, link, and timer.
 *
 * @param attempt - The current login attempt counter value (pre-incremented by caller).
 * @param getAttempt - Returns the latest attempt counter (may have changed if user cancelled).
 */
export async function handleLogin(ctx: AuthContext, attempt: number, getAttempt: () => number): Promise<void> {
  const authService = QronosAuthService.getInstance()
  console.log("[Qronos] 🔐 Starting device auth flow...")

  try {
    const auth = await authService.requestDeviceCode()
    if (attempt !== getAttempt()) return

    console.log("[Qronos] 🔐 Got device code:", auth.user_code, "URL:", auth.verification_uri)

    ctx.postMessage({
      type: "deviceAuthStarted",
      code: auth.user_code,
      verificationUrl: auth.verification_uri || "https://github.com/login/device",
      expiresIn: auth.expires_in || 900,
    })

    if (auth.user_code) {
      void vscode.env.clipboard.writeText(auth.user_code)
    }

    if (auth.verification_uri) {
      void vscode.env.openExternal(vscode.Uri.parse(auth.verification_uri))
    }

    void vscode.window
      .showInformationMessage(
        `⚡ Qronos Code: Your GitHub device code is ${auth.user_code} (copied to clipboard). Enter it in GitHub to sign in.`,
        "Open GitHub",
      )
      .then((choice) => {
        if (choice === "Open GitHub" && auth.verification_uri) {
          void vscode.env.openExternal(vscode.Uri.parse(auth.verification_uri))
        }
      })

    await new Promise<void>((resolve, reject) => {
      void authService.pollForToken(
        auth.device_code!,
        auth.interval || 5,
        async (session) => {
          if (attempt !== getAttempt()) return resolve()

          console.log("[Qronos] 🔐 Login successful! 10M tokens active.")

          ctx.invalidateProviderUsage()
          ctx.invalidateProviders()
          await ctx.disposeGlobal()

          const profileData = {
            profile: {
              email: session.email || "developer@qronos.me",
              name: session.username || "Qronos Developer",
              hasPersonalAccount: true,
            },
            balance: { balance: 10_000_000 },
            kiloPass: {
              currentPeriodBaseCreditsUsd: 100,
              currentPeriodUsageUsd: 0,
              currentPeriodBonusCreditsUsd: 0,
            },
            currentOrgId: null,
          }
          ctx.postMessage({ type: "profileData", data: profileData })
          ctx.postMessage({ type: "deviceAuthComplete" })
          await ctx.fetchAndSendProviders()
          resolve()
        },
        (err) => {
          if (attempt !== getAttempt()) return resolve()
          ctx.postMessage({
            type: "deviceAuthFailed",
            error: err.message || "Login failed",
          })
          reject(err)
        },
      )
    })
  } catch (error) {
    if (attempt !== getAttempt()) return
    ctx.postMessage({
      type: "deviceAuthFailed",
      error: getErrorMessage(error) || "Login failed",
    })
  }
}

/** Handle logout: remove auth credentials and clear profile. */
export async function handleLogout(ctx: AuthContext): Promise<void> {
  try {
    console.log("[Qronos] 🚪 Logging out...")
    await QronosAuthService.getInstance().clearToken()
    if (ctx.client) {
      await ctx.client.auth.remove({ providerID: "qronos" }).catch(() => undefined)
      await ctx.client.auth.remove({ providerID: "kilo" }).catch(() => undefined)
    }
    console.log("[Qronos] 🚪 Logged out successfully")
    ctx.postMessage({ type: "profileData", data: null })

    ctx.invalidateProviderUsage()
    ctx.invalidateProviders()
    await ctx.disposeGlobal()

    await ctx.fetchAndSendProviders()
  } catch (error) {
    console.error("[Qronos] ❌ Logout failed:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to logout",
    })
  }
}

/**
 * Handle organization switch.
 * Persists the selection and refreshes profile + providers since both change with org context.
 */
export async function handleSetOrganization(ctx: AuthContext, organizationId: string | null): Promise<void> {
  if (!ctx.client) return

  console.log("[Kilo New] KiloProvider: Switching organization:", organizationId ?? "personal")
  try {
    await ctx.client.kilo.organization.set({ organizationId }, { throwOnError: true })
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to switch organization:", error)
    // Re-fetch current profile to reset webview state — best-effort
    try {
      const result = await ctx.client.kilo.profile()
      ctx.postMessage({ type: "profileData", data: result.data ?? null })
    } catch (profileError) {
      console.error("[Kilo New] KiloProvider: Failed to refresh profile after org switch error:", profileError)
    }
    return
  }

  ctx.invalidateProviderUsage()
  ctx.invalidateProviders()
  await ctx.disposeGlobal()

  // Org switch succeeded — refresh profile and providers independently (best-effort)
  try {
    const result = await ctx.client.kilo.profile()
    ctx.postMessage({ type: "profileData", data: result.data ?? null })
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to refresh profile after org switch:", error)
  }
  try {
    await ctx.fetchAndSendProviders()
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to refresh providers after org switch:", error)
  }
  try {
    await ctx.fetchAndSendAgents()
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to refresh agents after org switch:", error)
  }
  try {
    await ctx.fetchAndSendSpeechToTextModels()
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to refresh speech-to-text models after org switch:", error)
  }
}

/** Handle profile refresh request. */
export async function handleRefreshProfile(ctx: AuthContext): Promise<void> {
  console.log("[Qronos] 🔄 Refreshing profile...")
  const authService = QronosAuthService.getInstance()
  const token = await authService.getStoredToken()

  if (token) {
    const session = authService.getSession()
    const profileData = {
      profile: {
        email: session?.email || "developer@qronos.me",
        name: session?.username || "Qronos Developer",
        hasPersonalAccount: true,
      },
      balance: { balance: 10_000_000 },
      kiloPass: {
        currentPeriodBaseCreditsUsd: 100,
        currentPeriodUsageUsd: 0,
        currentPeriodBonusCreditsUsd: 0,
      },
      currentOrgId: null,
    }
    ctx.postMessage({ type: "profileData", data: profileData })
    return
  }

  if (ctx.client) {
    const result = await ctx.client.kilo.profile().catch(() => ({ data: null }))
    ctx.postMessage({ type: "profileData", data: result.data ?? null })
  } else {
    ctx.postMessage({ type: "profileData", data: null })
  }
}
