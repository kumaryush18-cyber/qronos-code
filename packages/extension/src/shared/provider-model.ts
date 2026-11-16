import type { ProviderFailure } from "@qronos-ai/sdk/v2/client"

// qronos_change - one provider id only. The gateway is `qronos`; `qronos` is gone.
export const QRONOS_PROVIDER_ID = "qronos"
/** @deprecated use QRONOS_PROVIDER_ID - kept so older call sites keep compiling */
export const QRONOS_PROVIDER_ID = QRONOS_PROVIDER_ID
// qronos_change - must match the real id served by https://api.qronos.me/v1/models.
// The gateway uses `<family>-<version>-<tier>` (claude-5.5-sonnet), not `claude-sonnet-5.5`.
export const QRONOS_DEFAULT_MODEL = "claude-5.5-sonnet"
export const QRONOS_AUTO = { providerID: QRONOS_PROVIDER_ID, modelID: QRONOS_DEFAULT_MODEL } as const
export const CUSTOM_PROVIDER_PACKAGES = ["@ai-sdk/openai-compatible", "@ai-sdk/openai", "@ai-sdk/anthropic"] as const
export type CustomProviderPackage = (typeof CUSTOM_PROVIDER_PACKAGES)[number]
export const CUSTOM_PROVIDER_PACKAGE: CustomProviderPackage = "@ai-sdk/openai-compatible"
export const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

// Priority order: Qronos Gateway first, then standard direct providers
export const PROVIDER_PRIORITY = [
  QRONOS_PROVIDER_ID,
  "anthropic",
  "deepseek",
  "openai",
  "google",
  "openrouter",
  "vercel",
] as const

export function isCustomProviderPackage(value: unknown): value is CustomProviderPackage {
  return CUSTOM_PROVIDER_PACKAGES.includes(value as CustomProviderPackage)
}

export function parseModelString(raw: string | undefined | null) {
  if (!raw) return null
  const slash = raw.indexOf("/")
  if (slash <= 0 || slash >= raw.length - 1) return null
  return { providerID: raw.slice(0, slash), modelID: raw.slice(slash + 1) }
}

export function providerOrderIndex(providerID: string, order = PROVIDER_PRIORITY) {
  const index = order.indexOf(providerID.toLowerCase() as (typeof PROVIDER_PRIORITY)[number])
  return index >= 0 ? index : order.length
}

export function createQronosFallbackProvider() {
  return {
    id: QRONOS_PROVIDER_ID,
    name: "Qronos AI Universal Gateway",
    source: "custom" as const,
    env: ["QRONOS_API_KEY", "QRONOS_API_KEY"],
    metadata: {
      noteKey: "settings.providers.note.qronos",
      icon: QRONOS_PROVIDER_ID,
      priority: 0,
    },
    // qronos_change - no hardcoded catalogue. The list always comes from
    // GET https://api.qronos.me/v1/models, so it can never drift again.
    models: {},
  }
}

/** Look up the typed failure reported for a provider, if any. */
export function providerFailure(providerID: string, failures: ProviderFailure[]): ProviderFailure | undefined {
  return failures.find((item) => item.providerID === providerID)
}

/** Localization key (and interpolation vars) for a provider failure reason. Mirrors the CLI/TUI copy. */
export function providerFailureMessageKey(failure: ProviderFailure): { key: string; vars?: { status: number } } {
  switch (failure.kind) {
    case "unauthorized":
      return failure.status
        ? { key: "provider.failure.unauthorized", vars: { status: failure.status } }
        : { key: "provider.failure.unauthorizedNoStatus" }
    case "unauthenticated":
      return { key: "provider.failure.unauthenticated" }
    case "network":
      return { key: "provider.failure.network" }
    case "http":
      return failure.status
        ? { key: "provider.failure.http", vars: { status: failure.status } }
        : { key: "provider.failure.httpNoStatus" }
    case "schema":
      return { key: "provider.failure.schema" }
  }
}

/** Whether a failure reason should offer a sign-in action, per the canonical copy table. */
export function providerFailureNeedsSignIn(failure: ProviderFailure): boolean {
  return failure.kind === "unauthorized" || failure.kind === "unauthenticated"
}
