import * as vscode from "vscode"

export interface DeviceAuthResponse {
  /** qronos_change - the backend may return `device_code` or `session_id`; both are accepted. */
  device_code?: string
  session_id?: string
  user_code?: string
  verification_uri?: string
  expires_in?: number
  interval?: number
}

export interface QronosUserSession {
  token: string
  userId?: number
  email?: string
  username?: string
  dailyTokens: number
}

export class QronosAuthService {
  private static instance: QronosAuthService | null = null
  private context: vscode.ExtensionContext | null = null
  private activePolling = false
  private currentSession: QronosUserSession | null = null

  public static getInstance(): QronosAuthService {
    if (!QronosAuthService.instance) {
      QronosAuthService.instance = new QronosAuthService()
    }
    return QronosAuthService.instance
  }

  public init(context: vscode.ExtensionContext): void {
    this.context = context
    // Restore saved API key on startup
    void this.getStoredToken().then((token) => {
      if (token) {
        process.env.QRONOS_API_KEY = token
        process.env.KILO_API_KEY = token
        this.currentSession = {
          token,
          dailyTokens: 10_000_000,
        }
      }
    })
  }

  public async getStoredToken(): Promise<string | undefined> {
    if (!this.context) return process.env.QRONOS_API_KEY || process.env.KILO_API_KEY
    return (
      (await this.context.secrets.get("qronos.apiKey")) ||
      process.env.QRONOS_API_KEY ||
      process.env.KILO_API_KEY
    )
  }

  public async saveToken(token: string): Promise<void> {
    const cleanToken = token.trim()
    if (this.context) {
      await this.context.secrets.store("qronos.apiKey", cleanToken)
    }
    process.env.QRONOS_API_KEY = cleanToken
    process.env.KILO_API_KEY = cleanToken
    this.currentSession = {
      token: cleanToken,
      dailyTokens: 10_000_000,
    }
  }

  public async clearToken(): Promise<void> {
    if (this.context) {
      await this.context.secrets.delete("qronos.apiKey")
    }
    delete process.env.QRONOS_API_KEY
    delete process.env.KILO_API_KEY
    this.currentSession = null
  }

  /**
   * Request device code and verification URI from Qronos AI
   */
  public async requestDeviceCode(): Promise<DeviceAuthResponse> {
    const urls = [
      "https://qronos.me/auth/github/device",
      "https://api.qronos.me/auth/github/device",
    ]

    let lastError: Error | null = null
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "qronos-code/1.0.0 (VSCode Extension)",
          },
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Device code request returned HTTP ${res.status}: ${errText}`)
        }

        const data = (await res.json()) as DeviceAuthResponse
        // qronos_change - normalise both backend shapes into one:
        //   Kilo style:  { device_code, user_code, verification_uri, expires_in, interval }
        //   Qronos style:{ session_id, user_code, verification_uri, interval }
        const handle = data.device_code || data.session_id
        if (!handle) throw new Error("Device code response did not contain a device_code or session_id")
        return {
          device_code: handle,
          session_id: data.session_id || handle,
          user_code: data.user_code || "",
          verification_uri: data.verification_uri || "https://github.com/login/device",
          expires_in: data.expires_in || 900,
          interval: data.interval || 5,
        }
      } catch (err: any) {
        lastError = err
      }
    }

    throw lastError || new Error("Failed to request GitHub device authorization code from Qronos AI")
  }

  /**
   * Poll for device authorization completion
   */
  public async pollForToken(
    deviceCode: string,
    intervalSeconds = 5,
    onSuccess?: (session: QronosUserSession) => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    this.activePolling = true
    const intervalMs = Math.max(intervalSeconds, 3) * 1000
    const pollUrl = "https://qronos.me/auth/token"

    const poll = async () => {
      if (!this.activePolling) return

      try {
        const res = await fetch(pollUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "qronos-code/1.0.0 (VSCode Extension)",
          },
          body: JSON.stringify({
            // qronos_change - send both field names so either backend accepts the poll
            device_code: deviceCode,
            session_id: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        })

        const data = await res.json()
        // qronos_change - Kilo returns `access_token`, Qronos returns `token`
        const accessToken = data.access_token || data.token
        if (accessToken) {
          this.activePolling = false
          await this.saveToken(accessToken)
          const session: QronosUserSession = {
            token: accessToken,
            userId: data.user?.id,
            email: data.user?.email ?? data.userEmail, // qronos_change - Qronos returns userEmail
            username: data.user?.username,
            dailyTokens: 10_000_000,
          }
          this.currentSession = session
          onSuccess?.(session)
          void vscode.window.showInformationMessage(
            "⚡ Successfully signed in to Qronos Code! 10M daily coding tokens active."
          )
          return
        }

        // qronos_change - Qronos reports progress with `status` instead of an error code
        if (data.status === "pending") {
          setTimeout(poll, intervalMs)
          return
        }
        if (data.status === "denied") {
          this.activePolling = false
          onError?.(new Error("GitHub authorization was denied"))
          return
        }
        if (data.status === "expired") {
          this.activePolling = false
          onError?.(new Error("The device code expired. Please start sign-in again."))
          return
        }

        if (data.error === "authorization_pending") {
          setTimeout(poll, intervalMs)
          return
        }

        if (data.error === "slow_down") {
          setTimeout(poll, intervalMs + 5000)
          return
        }

        throw new Error(data.error_description || data.error || "Authorization error")
      } catch (err: any) {
        if (err.message && err.message.includes("authorization_pending")) {
          setTimeout(poll, intervalMs)
          return
        }
        this.activePolling = false
        onError?.(err)
      }
    }

    setTimeout(poll, intervalMs)
  }

  public cancelPolling(): void {
    this.activePolling = false
  }

  public getSession(): QronosUserSession | null {
    return this.currentSession
  }
}
