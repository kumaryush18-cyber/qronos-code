import { Effect, Option, Schema } from "effect" // qronos_change - Option added for qronos-exa transport dispatch
import { HttpClient } from "effect/unstable/http"
import * as Tool from "./tool"
import * as McpWebSearch from "./mcp-websearch"
import * as QronosExa from "@/qronos/tool/websearch-qronos-exa" // qronos_change - Qronos-REST Exa transport
import DESCRIPTION from "./websearch.txt"
import { checksum } from "@qronos-ai/core/util/encode"
import { InstallationVersion } from "@qronos-ai/core/installation/version"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { Auth } from "@/auth" // qronos_change - source Qronos bearer for Qronos-REST transport
import { Env } from "@/env" // qronos_change - config via Env.Service instead of process.env reads

const MAX_RESULTS = 10 // qronos_change - cap numResults across all transports

export const Parameters = Schema.Struct({
  query: Schema.String.annotate({ description: "Websearch query" }),
  numResults: Schema.optional(Schema.Number).annotate({
    description: "Number of search results to return (default: 8, maximum: 10)", // qronos_change - note MAX_RESULTS cap
  }),
  livecrawl: Schema.optional(Schema.Literals(["fallback", "preferred"])).annotate({
    description:
      "Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')",
  }),
  type: Schema.optional(Schema.Literals(["auto", "fast", "deep"])).annotate({
    description: "Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search",
  }),
  contextMaxCharacters: Schema.optional(Schema.Number).annotate({
    description: "Maximum characters for context string optimized for LLMs (default: 10000)",
  }),
})

const WebSearchProviderSchema = Schema.Literals(["exa", "parallel", "qronos-exa"]) // qronos_change - qronos-exa env override
export type WebSearchProvider = Schema.Schema.Type<typeof WebSearchProviderSchema>

// qronos_change start - signature reflowed by the added override parameter (QRONOS_WEBSEARCH_PROVIDER resolved via Env.Service by the caller)
export function selectWebSearchProvider(
  sessionID: string,
  flags = { exa: false, parallel: false },
  override?: string,
): WebSearchProvider {
  // qronos_change end
  if (override === "exa" || override === "parallel" || override === "qronos-exa") return override // qronos_change - qronos-exa env override
  if (flags.parallel) return "parallel"
  if (flags.exa) return "exa"

  return Number.parseInt(checksum(sessionID) ?? "0", 36) % 2 === 0 ? "exa" : "parallel"
}

export function webSearchProviderLabel(provider: unknown) {
  if (provider === "parallel") return "Parallel Web Search"
  if (provider === "exa" || provider === "qronos-exa") return "Exa Web Search" // qronos_change - qronos-exa shares label
  return "Web Search"
}

export function webSearchModelName(extra: Tool.Context["extra"]) {
  const model = extra?.model
  if (!model || typeof model !== "object") return undefined
  const api = "api" in model && model.api && typeof model.api === "object" ? model.api : undefined
  const apiID = api && "id" in api && typeof api.id === "string" ? api.id : undefined
  const id = "id" in model && typeof model.id === "string" ? model.id : undefined
  return (apiID ?? id)?.slice(0, 100)
}

// qronos_change start - API keys are resolved via Env.Service in the tool and passed down
function parallelAuthHeaders(apiKey: string | undefined) {
  const headers = { "User-Agent": `opencode/${InstallationVersion}` }
  if (!apiKey) return headers
  return { ...headers, Authorization: `Bearer ${apiKey}` }
}
// qronos_change end

function callProvider(
  http: HttpClient.HttpClient,
  provider: WebSearchProvider,
  params: Schema.Schema.Type<typeof Parameters>,
  ctx: Tool.Context,
  keys: { exa: string | undefined; parallel: string | undefined }, // qronos_change
) {
  if (provider === "parallel") {
    return McpWebSearch.call(
      http,
      McpWebSearch.PARALLEL_URL,
      "web_search",
      McpWebSearch.ParallelSearchArgs,
      {
        objective: params.query,
        search_queries: [params.query],
        session_id: ctx.sessionID,
        model_name: webSearchModelName(ctx.extra),
      },
      "25 seconds",
      parallelAuthHeaders(keys.parallel), // qronos_change
    )
  }

  return McpWebSearch.call(
    http,
    McpWebSearch.exaUrl(keys.exa), // qronos_change
    "web_search_exa",
    McpWebSearch.SearchArgs,
    {
      query: params.query,
      type: params.type || "auto",
      numResults: Math.min(params.numResults || 8, MAX_RESULTS), // qronos_change - cap at MAX_RESULTS
      livecrawl: params.livecrawl || "fallback",
      contextMaxCharacters: params.contextMaxCharacters,
    },
    "25 seconds",
  )
}

export const WebSearchTool = Tool.define(
  "websearch",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const flags = yield* RuntimeFlags.Service
    const authSvc = yield* Auth.Service // qronos_change - source Qronos bearer for Qronos-REST transport
    const env = yield* Env.Service // qronos_change - config via Env.Service instead of process.env reads

    return {
      get description() {
        return DESCRIPTION.replace("{{year}}", new Date().getFullYear().toString())
      },
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          // qronos_change start - config via Env.Service instead of process.env reads
          const [override, exaKey, parallelKey] = yield* Effect.all([
            env.get("QRONOS_WEBSEARCH_PROVIDER"),
            env.get("EXA_API_KEY"),
            env.get("PARALLEL_API_KEY"),
          ])
          const provider = selectWebSearchProvider(
            ctx.sessionID,
            {
              exa: flags.enableExa,
              parallel: flags.enableParallel,
            },
            override,
          )
          // qronos_change end
          const title = webSearchProviderLabel(provider)
          // qronos_change start - Qronos-REST Exa transport
          // Precedence:
          //   provider="qronos-exa"          -> qronos-rest  (auth required)
          //   provider="exa" + EXA_API_KEY -> mcp-exa-byok     (BYOK wins)
          //   provider="exa" + Qronos auth   -> qronos-rest        (new default for authed users)
          //   provider="exa" + no auth     -> mcp-exa-unauth   (preserves current fallback)
          //   provider="parallel"          -> mcp-parallel     (unchanged)
          const qronosToken = yield* Effect.gen(function* () {
            if (provider !== "exa" && provider !== "qronos-exa") return undefined as string | undefined
            const info = yield* authSvc.get("qronos")
            if (!info) return undefined
            return info.type === "api" ? info.key : info.type === "oauth" ? info.access : undefined
          })
          const transport =
            provider === "qronos-exa"
              ? "qronos-rest"
              : provider === "parallel"
                ? "mcp-parallel"
                : provider === "exa" && exaKey
                  ? "mcp-exa-byok"
                  : provider === "exa" && qronosToken
                    ? "qronos-rest"
                    : "mcp-exa-unauth"
          // qronos_change end
          // qronos_change start - add transport to metadata
          yield* ctx.metadata({
            title: `${title} "${params.query}"`,
            metadata: { provider, transport },
          })
          // qronos_change end

          yield* ctx.ask({
            permission: "websearch",
            patterns: [params.query],
            always: ["*"],
            metadata: {
              query: params.query,
              numResults: params.numResults,
              livecrawl: params.livecrawl,
              type: params.type,
              contextMaxCharacters: params.contextMaxCharacters,
              provider,
            },
          })

          // qronos_change start - dispatch Qronos-REST transport
          const result = yield* transport === "qronos-rest"
            ? qronosToken
              ? QronosExa.callQronosExa(
                  http,
                  {
                    query: params.query,
                    type: params.type,
                    numResults: params.numResults,
                  },
                  qronosToken,
                )
              : Effect.die(new Error("QRONOS_WEBSEARCH_PROVIDER=qronos-exa requires Qronos auth; run `qronos auth login`"))
            : callProvider(http, provider, params, ctx, { exa: exaKey, parallel: parallelKey }) // qronos_change
          // qronos_change end

          return {
            output: result ?? "No search results found. Please try a different query.",
            title: `${title}: ${params.query}`,
            metadata: { provider, transport }, // qronos_change - add transport
          }
        }).pipe(Effect.orDie),
    }
  }),
)
