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

// qronos_change start - last-resort search with no key and no MCP server.
// Bing answers plain HTML to a normal GET; DuckDuckGo often returns an
// anti-bot challenge, so it is tried second. Results are labelled degraded so
// the model knows they are scraped page titles, not a ranked search API.
const HTML_ENGINES = [
  { name: "bing", url: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { name: "duckduckgo", url: (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}` },
]
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

function htmlToText(input: string) {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

/** Bing wraps every hit in /ck/a?u=a1<base64url>; DuckDuckGo uses /l/?uddg=. */
export function unwrapEngineUrl(raw: string) {
  const url = raw.replace(/&amp;/g, "&")
  try {
    const parsed = new URL(url, "https://www.bing.com")
    const u = parsed.searchParams.get("u")
    if (u?.startsWith("a1")) {
      const decoded = Buffer.from(u.slice(2).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
      if (/^https?:/.test(decoded)) return decoded
    }
    const uddg = parsed.searchParams.get("uddg")
    if (uddg && /^https?:/.test(uddg)) return uddg
  } catch {}
  return url
}

/** Pull title/link/snippet triples out of a Bing or DuckDuckGo results page. */
export function parseHtmlResults(html: string, limit: number) {
  const out: { title: string; url: string; snippet: string }[] = []
  const patterns = [
    /<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?/g,
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g,
  ]
  for (const re of patterns) {
    for (const match of html.matchAll(re)) {
      const url = match[1] ? unwrapEngineUrl(match[1]) : undefined
      if (!url || !/^https?:/.test(url)) continue
      const title = htmlToText(match[2] ?? "")
      if (!title) continue
      if (out.some((item) => item.url === url)) continue
      out.push({ title, url, snippet: htmlToText(match[3] ?? "") })
      if (out.length >= limit) return out
    }
  }
  return out
}

async function searchHtmlEngine(query: string, limit: number) {
  for (const engine of HTML_ENGINES) {
    try {
      const res = await fetch(engine.url(query), {
        headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml" },
      })
      if (!res.ok) continue
      const results = parseHtmlResults(await res.text(), limit)
      if (results.length === 0) continue
      const body = results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}${r.snippet ? `\n   ${r.snippet}` : ""}`)
        .join("\n")
      return `Search results (fallback via ${engine.name}; the search API was unreachable, so these are page titles):\n\n${body}`
    } catch {
      continue
    }
  }
  return undefined
}
// qronos_change end

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
          // qronos_change start - free MCP transports, gateway only on request
          // Precedence:
          //   provider="qronos-exa"        -> qronos-rest (explicit opt-in, auth required)
          //   provider="exa" + EXA_API_KEY -> mcp-exa-byok   (own key bypasses Exa's cap)
          //   provider="exa"               -> mcp-exa-unauth (free, ~50/day per IP)
          //   provider="parallel"          -> mcp-parallel   (free, never billed past the limit)
          // The gateway used to be the default for signed-in users, but
          // api.qronos.me/api/exa/search answers with the website HTML, so every
          // search failed. Both hosted MCP servers answer without a key.
          const qronosToken = yield* Effect.gen(function* () {
            if (provider !== "exa" && provider !== "qronos-exa") return undefined as string | undefined
            const info = yield* authSvc.get("qronos")
            if (!info) return undefined
            return info.type === "api" ? info.key : info.type === "oauth" ? info.access : undefined
          })
          const transportFor = (target: WebSearchProvider) =>
            target === "qronos-exa"
              ? "qronos-rest"
              : target === "parallel"
                ? "mcp-parallel"
                : exaKey
                  ? "mcp-exa-byok"
                  : "mcp-exa-unauth"
          const transport = transportFor(provider)
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

          // qronos_change start - one attempt per provider, other free MCP as fallback
          const attempt = (target: WebSearchProvider) =>
            Effect.gen(function* () {
              if (target !== "qronos-exa")
                return yield* callProvider(http, target, params, ctx, { exa: exaKey, parallel: parallelKey })
              if (!qronosToken)
                return yield* Effect.die(
                  new Error(
                    "QRONOS_WEBSEARCH_PROVIDER=qronos-exa requires Qronos auth; run `qronos auth login`",
                  ),
                )
              return yield* QronosExa.callQronosExa(
                http,
                { query: params.query, type: params.type, numResults: params.numResults },
                qronosToken,
              )
            })

          // A rate limited free tier or an unreachable host must not end the
          // search: fall through to the other provider once, then report.
          let result = Option.none<string>()
          let used = provider
          const order: WebSearchProvider[] =
            provider === "parallel" ? ["parallel", "exa"] : provider === "exa" ? ["exa", "parallel"] : [provider]
          for (const target of order) {
            const outcome = yield* Effect.exit(attempt(target))
            if (outcome._tag === "Success") {
              result = Option.fromNullishOr(outcome.value ?? undefined) // qronos_change - fromNullable is not in this Effect build
              used = target
              break
            }
          }
          // qronos_change - both hosted MCP servers failed: scrape a plain
          // results page rather than telling the user search is broken.
          if (Option.isNone(result) && provider !== "qronos-exa") {
            const scraped = yield* Effect.promise(() => searchHtmlEngine(params.query, params.numResults ?? 5))
            if (scraped) result = Option.some(scraped)
          }
          // qronos_change end

          return {
            output: Option.getOrElse(result, () => "No search results found. Please try a different query."),
            title: `${title}: ${params.query}`,
            metadata: { provider: used, transport: transportFor(used) }, // qronos_change - record the one that answered
          }
        }).pipe(Effect.orDie),
    }
  }),
)
