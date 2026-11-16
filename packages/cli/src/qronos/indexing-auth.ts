import type { IndexingConfig } from "@qronos-ai/indexing/config"

type Auth = unknown

type Env = {
  QRONOS_API_KEY?: string
  QRONOS_ORG_ID?: string
}

type Provider = {
  key?: unknown
  options?: Record<string, unknown>
}

export type QronosIndexingAuth = {
  apiKey?: string
  baseUrl?: string
  organizationId?: string
}

const providers = [
  "openai",
  "ollama",
  "openai-compatible",
  "gemini",
  "mistral",
  "vercel-ai-gateway",
  "bedrock",
  "openrouter",
  "voyage",
]

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return
  const trimmed = value.trim()
  return trimmed || undefined
}

function token(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "api") return text(data.key)
  if (data.type === "oauth") return text(data.access)
  return
}

function org(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "oauth") return text(data.accountId)
  return
}

function value(input: unknown): boolean {
  if (input === undefined || input === null) return false
  if (typeof input === "string") return input.trim().length > 0
  if (typeof input === "object") return Object.values(input).some(value)
  return true
}

function hasOtherProvider(indexing: unknown): boolean {
  const cfg = record(indexing)
  return providers.some((provider) => value(cfg[provider]))
}

export function resolveQronosIndexingAuth(input: {
  config?: unknown
  provider?: Provider
  auth?: Auth
  env?: Env
}): QronosIndexingAuth {
  const config = record(input.config)
  const options = record(record(config.provider).qronos)
  const provider = input.provider ?? record(input.provider)
  const providerOptions = record(provider.options)
  const providerConfig = record(options.options)
  const qronos = record(record(config.indexing).qronos)
  const env = input.env ?? process.env

  return {
    apiKey:
      text(qronos.apiKey) ??
      text(providerConfig.apiKey) ??
      token(input.auth) ??
      text(provider.key) ??
      text(providerOptions.qronosToken) ??
      text(env.QRONOS_API_KEY),
    baseUrl: text(qronos.baseUrl) ?? text(providerConfig.baseURL) ?? text(providerConfig.baseUrl),
    organizationId:
      text(qronos.organizationId) ??
      text(providerConfig.qronosOrganizationId) ??
      org(input.auth) ??
      text(providerOptions.qronosOrganizationId) ??
      text(env.QRONOS_ORG_ID),
  }
}

export function hasQronosIndexingAuth(input: Parameters<typeof resolveQronosIndexingAuth>[0]): boolean {
  return !!resolveQronosIndexingAuth(input).apiKey
}

export function shouldDefaultIndexingToQronos(indexing: unknown, auth: QronosIndexingAuth): boolean {
  const cfg = record(indexing)
  if (cfg.provider !== undefined || !auth.apiKey) return false
  return !hasOtherProvider(cfg)
}

export function indexingWithQronosDefault(
  indexing: IndexingConfig | undefined,
  auth: QronosIndexingAuth,
): IndexingConfig | undefined {
  if (!shouldDefaultIndexingToQronos(indexing, auth)) return indexing
  return { ...indexing, provider: "qronos" }
}
