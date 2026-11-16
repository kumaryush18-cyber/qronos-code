import { z } from "zod"
import { getQronosUrlFromToken } from "../auth/token.js"
import { getDefaultHeaders, buildQronosHeaders } from "../headers.js"
import { resolveQronosGatewayBaseUrl, resolveQronosGatewayUrl } from "./url.js"
import { QRONOS_OPENROUTER_BASE, MODELS_FETCH_TIMEOUT_MS, PROMPTS, AI_SDK_PROVIDERS } from "./constants.js"

export type QronosModelsResult = {
  models: Record<string, any>
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number; retryAfter?: number }
}

/**
 * OpenRouter model schema
 */
const openRouterArchitectureSchema = z.object({
  input_modalities: z.array(z.string()).nullish(),
  output_modalities: z.array(z.string()).nullish(),
  tokenizer: z.string().nullish(),
})

const openRouterPricingSchema = z.object({
  prompt: z.union([z.string(), z.number()]).nullish(),
  completion: z.union([z.string(), z.number()]).nullish(),
  input_cache_write: z.union([z.string(), z.number()]).nullish(),
  input_cache_read: z.union([z.string(), z.number()]).nullish(),
  input_usd_per_million: z.number().nullish(),
  output_usd_per_million: z.number().nullish(),
})

const openRouterModelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  display_name: z.string().optional(),
  description: z.string().optional(),
  context_length: z.number().optional(),
  context_window: z.number().optional(),
  max_completion_tokens: z.number().nullish(),
  max_output_tokens: z.number().nullish(),
  capabilities: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  pricing: openRouterPricingSchema.passthrough().optional(),
  architecture: openRouterArchitectureSchema.optional(),
  top_provider: z.object({ max_completion_tokens: z.number().nullish() }).optional(),
  supported_parameters: z.array(z.string()).optional(),
  preferredIndex: z.number().optional(),
  isFree: z.boolean().optional(),
  mayTrainOnYourPrompts: z.boolean().optional(),
  hasUserByokAvailable: z.boolean().optional(),
  autoRouting: z
    .object({
      models: z.array(z.string()),
    })
    .optional()
    .catch(undefined),
  terminalBench: z
    .object({
      overallScore: z.number(),
      avgAttemptCostUsd: z.number(),
    })
    .optional()
    .catch(undefined),
  opencode: z
    .object({
      family: z.string().optional(),
      prompt: z.enum(PROMPTS).optional().catch(undefined),
      variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
      reasoning_options: z.array(z.unknown()).optional().catch(undefined),
      ai_sdk_provider: z.enum(AI_SDK_PROVIDERS).optional().catch(undefined),
    })
    .optional(),
}).passthrough()

const openRouterModelsResponseSchema = z.object({
  data: z.array(openRouterModelSchema),
})

type OpenRouterModel = z.infer<typeof openRouterModelSchema>

/**
 * Parse API price string to number, converting from per-token to per-million-tokens.
 * The API returns prices in $/token, but downstream cost calculation (getUsage)
 * divides by 1,000,000 expecting $/M tokens.
 */
function parseApiPrice(price: string | null | undefined): number | undefined {
  if (!price) return undefined
  const parsed = parseFloat(price)
  if (isNaN(parsed) || parsed < 0) return undefined
  return parsed * 1_000_000 // Convert $/token → $/M tokens
}

/**
 * Fetch models from Qronos API (OpenRouter-compatible endpoint)
 *
 * @param options - Configuration options
 * @returns Typed result with models and optional error info
 */
export async function fetchQronosModels(options?: {
  qronosToken?: string
  qronosOrganizationId?: string
  baseURL?: string
}): Promise<QronosModelsResult> {
  const raw = await fetchRawQronosModels(options)
  if (raw.error) return { models: {}, error: raw.error }

  // Transform models to ModelsDev.Model format
  const models: Record<string, any> = {}

  for (const model of raw.data) {
    // Skip models that explicitly don't support tools — Qronos requires tool calling
    if (!supportsTools(model)) continue

    const transformedModel = transformToModelDevFormat(model)
    models[model.id] = transformedModel
  }

  return { models }
}

export type QronosImageModel = {
  id: string
  name: string
  description?: string
}

export type QronosImageModelsResult = {
  models: QronosImageModel[]
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number }
}

export type QronosTranscriptionModel = {
  id: string
  name: string
}

export type QronosTranscriptionModelsResult = {
  models: QronosTranscriptionModel[]
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number }
}

/**
 * Fetch image-capable models from Qronos API (OpenRouter-compatible endpoint).
 * Uses the same raw fetch as {@link fetchQronosModels} but keeps only models
 * whose `output_modalities` include `"image"`.
 */
export async function fetchQronosImageModels(options?: {
  qronosToken?: string
  qronosOrganizationId?: string
  baseURL?: string
}): Promise<QronosImageModelsResult> {
  const raw = await fetchRawQronosModels(options)
  if (raw.error) return { models: [], error: raw.error }

  const models: QronosImageModel[] = []

  for (const model of raw.data) {
    if (model.architecture?.output_modalities?.includes("image")) {
      // qronos_change - gateway model names are optional; fall back to the id
      models.push({ id: model.id, name: model.name ?? model.id, description: model.description })
    }
  }

  return { models }
}

export async function fetchQronosTranscriptionModels(options?: {
  qronosToken?: string
  qronosOrganizationId?: string
  baseURL?: string
}): Promise<QronosTranscriptionModelsResult> {
  const token = options?.qronosToken
  const organizationId = options?.qronosOrganizationId
  const url = new URL("transcription-models", resolveQronosGatewayBaseUrl({ baseURL: options?.baseURL, token }))
  const response = await fetch(url, {
    headers: {
      ...getDefaultHeaders(),
      ...buildQronosHeaders(undefined, { qronosOrganizationId: organizationId }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(MODELS_FETCH_TIMEOUT_MS),
  }).catch((err: unknown) => err as Error)

  if (response instanceof Error) return { models: [], error: { kind: "network" } }
  if (!response.ok) {
    const kind = response.status === 401 || response.status === 403 ? "unauthorized" : "http"
    return { models: [], error: { kind, status: response.status } }
  }

  const json = await response.json().catch(() => null)
  if (!json || !Array.isArray(json.data)) return { models: [], error: { kind: "schema" } }

  const data: unknown[] = json.data
  const models = data.filter(isTranscriptionModel).map((model) => ({
    id: model.id,
    name: model.name,
  }))
  if (models.length === 0) return { models: [], error: { kind: "schema" } }
  return { models }
}

type TranscriptionModelResponse = {
  id: string
  name: string
}

function isTranscriptionModel(value: unknown): value is TranscriptionModelResponse {
  if (!value || typeof value !== "object") return false
  const model = value as Record<string, unknown>
  return typeof model.id === "string" && typeof model.name === "string"
}

/**
 * Shared raw fetch + validate used by both {@link fetchQronosModels} and {@link fetchQronosImageModels}.
 */
async function fetchRawQronosModels(options?: {
  qronosToken?: string
  qronosOrganizationId?: string
  baseURL?: string
}): Promise<
  { data: OpenRouterModel[]; error?: undefined } | { data?: undefined; error: NonNullable<QronosModelsResult["error"]> }
> {
  const token = options?.qronosToken
  const organizationId = options?.qronosOrganizationId

  // Construct base URL
  const defaultBaseURL = organizationId
    ? resolveQronosGatewayUrl(`organizations/${organizationId}`)
    : QRONOS_OPENROUTER_BASE

  const baseURL = options?.baseURL ?? defaultBaseURL

  // Transform URL with token if available
  const finalBaseURL = token ? getQronosUrlFromToken(baseURL, token) : baseURL

  // Construct models endpoint
  const modelsURL = `${finalBaseURL}/models`

  const response = await fetch(modelsURL, {
    headers: {
      ...getDefaultHeaders(),
      ...buildQronosHeaders(undefined, { qronosOrganizationId: organizationId }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(MODELS_FETCH_TIMEOUT_MS),
  }).catch((err: unknown) => err as Error)

  if (response instanceof Error) {
    return { error: { kind: "network" } }
  }

  if (!response.ok) {
    if (response.status === 401 && token && !organizationId && !finalBaseURL.includes("/organizations/")) {
      return fetchRawQronosModels({})
    }
    const kind = response.status === 401 || response.status === 403 ? "unauthorized" : "http"
    const header = response.headers.get("retry-after")
    const seconds =
      header == null ? NaN : /^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000
    const retryAfter = Number.isFinite(seconds) ? Math.max(0, seconds) : undefined
    return { error: { kind, status: response.status, ...(retryAfter == null ? {} : { retryAfter }) } }
  }

  const json = await response.json().catch(() => null)

  if (json === null) {
    return { error: { kind: "schema" } }
  }

  // Validate response schema
  const result = openRouterModelsResponseSchema.safeParse(json)

  if (!result.success) {
    return { error: { kind: "schema" } }
  }

  return { data: result.data.data }
}

/**
 * Qronos requires tool calling, so models that explicitly omit "tools" are hidden.
 * Optimistically assume models with a missing or empty supported_parameters list
 * support tools (e.g. routers like typesafe/jev-router report an empty list).
 */
export function supportsTools(model: { supported_parameters?: string[] }): boolean {
  const params = model.supported_parameters
  if (!params || params.length === 0) return true
  return params.includes("tools")
}

/**
 * Transform OpenRouter model to ModelsDev.Model format
 */
function transformToModelDevFormat(model: OpenRouterModel): any {
  const inputModalities = model.architecture?.input_modalities || []
  const outputModalities = model.architecture?.output_modalities || []
  const supportedParameters = model.supported_parameters || []
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : []

  // Parse pricing
  const inputPrice = model.pricing?.input_usd_per_million != null
    ? model.pricing.input_usd_per_million / 1_000_000
    : parseApiPrice(typeof model.pricing?.prompt === "string" ? model.pricing.prompt : model.pricing?.prompt?.toString())
  const outputPrice = model.pricing?.output_usd_per_million != null
    ? model.pricing.output_usd_per_million / 1_000_000
    : parseApiPrice(typeof model.pricing?.completion === "string" ? model.pricing.completion : model.pricing?.completion?.toString())
  const cacheWritePrice = parseApiPrice(typeof model.pricing?.input_cache_write === "string" ? model.pricing.input_cache_write : undefined)
  const cacheReadPrice = parseApiPrice(typeof model.pricing?.input_cache_read === "string" ? model.pricing.input_cache_read : undefined)

  // Determine capabilities
  const supportsImages = inputModalities.includes("image") || capabilities.includes("vision") || capabilities.includes("multimodal")
  const tools = supportsTools(model)
  const supportsReasoning = supportedParameters.includes("reasoning") || capabilities.includes("reasoning") || capabilities.includes("thinking")
  const supportsTemperature = supportedParameters.includes("temperature") || true

  const contextLength = model.context_window || model.context_length || 1_000_000

  // Calculate max output tokens
  const maxOutputTokens =
    model.max_output_tokens || model.top_provider?.max_completion_tokens || model.max_completion_tokens || Math.min(64000, Math.ceil(contextLength * 0.2))

  return {
    id: model.id,
    name: model.display_name || model.name || model.id,
    family: model.opencode?.family ?? extractFamily(model.id),
    release_date: new Date().toISOString().split("T")[0], // Default to today
    attachment: supportsImages,
    reasoning: supportsReasoning,
    temperature: supportsTemperature,
    recommendedIndex: model.preferredIndex,
    // The gateway's `variants` are legacy; they only apply when `reasoning_options` is absent
    // (e.g. admin-authored custom LLM variants).
    variants: model.opencode?.reasoning_options
      ? legacyVariants(model.opencode.reasoning_options, model.opencode.ai_sdk_provider)
      : model.opencode?.variants,
    prompt: model.opencode?.prompt,
    ai_sdk_provider: model.opencode?.ai_sdk_provider,
    tool_call: tools,
    isFree: model.isFree ?? model.pricing?.input_usd_per_million === 0,
    mayTrainOnYourPrompts: model.mayTrainOnYourPrompts,
    hasUserByokAvailable: model.hasUserByokAvailable,
    ...(model.autoRouting && { autoRouting: model.autoRouting }),
    ...(model.terminalBench && { terminalBench: model.terminalBench }),
    cost: {
      input: inputPrice ?? 0.000001,
      output: outputPrice ?? 0.000002,
      ...(cacheReadPrice !== undefined && { cache_read: cacheReadPrice }),
      ...(cacheWritePrice !== undefined && { cache_write: cacheWritePrice }),
    },
    limit: {
      context: contextLength,
      output: maxOutputTokens,
    },
    modalities: {
      input: supportsImages ? ["text", "image"] : ["text"],
      output: ["text"],
    },
    options: {
      ...(model.description && { description: model.description }),
    },
  }
}

// Mirrors `ReasoningEffortSchema` and `VerbositySchema` in Qronos-Org/cloud `packages/db/src/schema-types.ts`.
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"]
const VERBOSITIES = ["low", "medium", "high", "xhigh", "max"]

const reasoningOptionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("toggle") }),
  z.object({ type: z.literal("effort"), values: z.array(z.unknown()) }),
])

/**
 * Builds the OpenRouter-shaped variants from the gateway's `reasoning_options`, mirroring
 * `toLegacyVariants` in Qronos-Org/cloud `packages/web-shared/src/lib/ai-gateway/providers/legacy-variants.ts`.
 * `[]` (reasoning that is always on) keeps a single `thinking` variant, a lone toggle becomes
 * `instant`/`thinking`, and effort variants of Anthropic models also get the matching `verbosity`,
 * which the gateway maps to Anthropic's `effort`. Unknown entries (e.g. `budget_tokens`) are dropped
 * one by one.
 */
function legacyVariants(
  raw: readonly unknown[],
  aiSdkProvider: NonNullable<OpenRouterModel["opencode"]>["ai_sdk_provider"],
) {
  const options = raw.flatMap((entry) => reasoningOptionSchema.safeParse(entry).data ?? [])
  const toggle = options.some((option) => option.type === "toggle")
  const efforts = [
    ...new Set(
      options.flatMap((option) =>
        option.type === "effort"
          ? option.values.filter(
              (value): value is string => typeof value === "string" && REASONING_EFFORTS.includes(value),
            )
          : [],
      ),
    ),
  ]
  const entries =
    raw.length === 0
      ? [["thinking", "high"]]
      : efforts.length === 0
        ? toggle
          ? [
              ["instant", "none"],
              ["thinking", "high"],
            ]
          : []
        : [...(toggle && !efforts.includes("none") ? ["none"] : []), ...efforts].map((effort) => [effort, effort])
  if (entries.length === 0) return undefined
  return Object.fromEntries(
    entries.map(([name, effort]) => [
      name,
      {
        reasoning: { enabled: effort !== "none", effort },
        ...(aiSdkProvider === "anthropic" && name === effort && VERBOSITIES.includes(effort) && { verbosity: effort }),
      },
    ]),
  )
}

/**
 * Extract family name from model ID
 * e.g., "anthropic/claude-3-opus" -> "claude"
 */
function extractFamily(modelId: string): string | undefined {
  const parts = modelId.split("/")
  if (parts.length < 2) return undefined

  const modelName = parts[1]

  // Try to extract family from common patterns
  if (modelName.includes("claude")) return "claude"
  if (modelName.includes("gpt")) return "gpt"
  if (modelName.includes("gemini")) return "gemini"
  if (modelName.includes("llama")) return "llama"
  if (modelName.includes("mistral")) return "mistral"

  return undefined
}

/**
 * Map OpenRouter modalities to ModelsDev modalities
 */
function mapModalities(modalities: string[]): Array<"text" | "audio" | "image" | "video" | "pdf"> {
  const result: Array<"text" | "audio" | "image" | "video" | "pdf"> = []

  for (const modality of modalities) {
    if (modality === "text") result.push("text")
    if (modality === "image") result.push("image")
    if (modality === "audio") result.push("audio")
    if (modality === "video") result.push("video")
    if (modality === "pdf") result.push("pdf")
  }

  // Always include text if not present
  if (!result.includes("text")) {
    result.unshift("text")
  }

  return result
}
