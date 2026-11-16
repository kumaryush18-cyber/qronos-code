// qronos_change - new file
import { Duration, Effect, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { QRONOS_API_BASE } from "@qronos-ai/gateway"

export const QRONOS_EXA_URL = `${QRONOS_API_BASE}/api/exa/search`
export const MAX_QRONOS_EXA_RESULTS = 10

const ExaResult = Schema.Struct({
  title: Schema.optional(Schema.String),
  url: Schema.String,
  publishedDate: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  highlights: Schema.optional(Schema.Array(Schema.String)),
})

const ExaResponse = Schema.Struct({
  results: Schema.Array(ExaResult),
})

const NO_RESULTS = "No search results found. Please try a different query."

const formatResults = (data: Schema.Schema.Type<typeof ExaResponse>): string => {
  if (data.results.length === 0) return NO_RESULTS
  return data.results
    .map((r, i) => {
      const head = `[${i + 1}] ${r.title ?? r.url}\n${r.url}${r.publishedDate ? ` (${r.publishedDate})` : ""}`
      const hl = r.highlights?.length ? `\n${r.highlights.map((h) => `> ${h}`).join("\n")}` : ""
      return `${head}${hl}`
    })
    .join("\n\n")
}

export type QronosExaParams = {
  query: string
  type?: string
  numResults?: number
}

export const callQronosExa = Effect.fn("WebSearchQronosExa.call")(function* (
  http: HttpClient.HttpClient,
  params: QronosExaParams,
  qronosToken: string,
) {
  const numResults = Math.min(params.numResults ?? MAX_QRONOS_EXA_RESULTS, MAX_QRONOS_EXA_RESULTS)
  const request = yield* HttpClientRequest.post(QRONOS_EXA_URL).pipe(
    HttpClientRequest.bearerToken(qronosToken),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyJson({
      query: params.query,
      type: params.type ?? "auto",
      numResults,
      contents: { highlights: true },
    }),
  )
  const response = yield* http.execute(request).pipe(
    Effect.timeoutOrElse({
      duration: Duration.seconds(25),
      orElse: () => Effect.die(new Error("qronos exa request timed out")),
    }),
  )
  const status = response.status
  if (status === 401 || status === 403) {
    return yield* Effect.die(new Error(`Qronos exa request unauthorized (${status}); sign in with \`qronos auth login\``))
  }
  if (status < 200 || status >= 300) {
    const body = yield* response.text
    return yield* Effect.die(new Error(`Qronos exa request failed (${status}): ${body.slice(0, 200)}`))
  }
  const data = yield* response.json
  const decode = Schema.decodeUnknownEffect(ExaResponse)
  const parsed = yield* decode(data).pipe(Effect.orDie)
  return formatResults(parsed)
})
