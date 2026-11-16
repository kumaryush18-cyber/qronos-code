import { describe, expect, test } from "bun:test"
import path from "node:path"
import { resolveQronosAiGatewayBase } from "../../src/api/constants"
import { resolveQronosGatewayBaseUrl, resolveQronosGatewayUrl, resolveQronosOpenRouterBaseUrl } from "../../src/api/url"

const src = path.resolve(import.meta.dir, "../../src")

// Gateway URLs are resolved from the environment at module load, so each env
// mode is exercised in a fresh process against the real call sites.
function probe(env: Record<string, string>) {
  const script = `
    const calls = []
    globalThis.fetch = async (input) => {
      calls.push(String(input))
      return Response.json({ data: [], models: [], defaultModel: "" })
    }
    const constants = await import(${JSON.stringify(`${src}/api/constants.ts`)})
    const url = await import(${JSON.stringify(`${src}/api/url.ts`)})
    const models = await import(${JSON.stringify(`${src}/api/models.ts`)})
    const embedding = await import(${JSON.stringify(`${src}/api/embedding-models.ts`)})
    const fim = await import(${JSON.stringify(`${src}/fim.ts`)})
    await models.fetchQronosModels({})
    await models.fetchQronosModels({ qronosOrganizationId: "org-1" })
    await models.fetchQronosTranscriptionModels({})
    await embedding.fetchQronosEmbeddingModelCatalog({ attempts: 1 })
    console.log(JSON.stringify({
      openrouter: constants.QRONOS_OPENROUTER_BASE,
      gateway: url.resolveQronosGatewayBaseUrl(),
      router: url.resolveQronosOpenRouterBaseUrl(),
      audio: url.resolveQronosGatewayUrl("audio/transcriptions"),
      fim: fim.resolveFimTarget().url,
      calls,
    }))
  `
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "QRONOS_API_URL" && key !== "QRONOS_AI_GATEWAY_URL"),
  )
  const proc = Bun.spawnSync([process.execPath, "-e", script], { env: { ...base, ...env }, cwd: src })
  expect(proc.stderr.toString()).toBe("")
  return JSON.parse(proc.stdout.toString())
}

describe("resolveQronosAiGatewayBase", () => {
  test("defaults to the AI gateway when no override is set", () => {
    expect(resolveQronosAiGatewayBase({})).toBe("https://api.qronos.me/v1")
  })

  test("uses the API app's gateway rewrite when only QRONOS_API_URL is set", () => {
    expect(resolveQronosAiGatewayBase({ QRONOS_API_URL: "http://localhost:3000/" })).toBe(
      "http://localhost:3000/api/gateway/v1",
    )
  })

  test("prefers QRONOS_AI_GATEWAY_URL over QRONOS_API_URL", () => {
    expect(
      resolveQronosAiGatewayBase({
        QRONOS_API_URL: "http://localhost:3000",
        QRONOS_AI_GATEWAY_URL: "http://localhost:3001/api/v1/",
      }),
    ).toBe("http://localhost:3001/api/v1")
  })

  test("ignores blank QRONOS_AI_GATEWAY_URL", () => {
    expect(resolveQronosAiGatewayBase({ QRONOS_AI_GATEWAY_URL: "  " })).toBe("https://api.qronos.me/v1")
  })
})

describe("gateway traffic by environment", () => {
  test("routes to the AI gateway by default", () => {
    expect(probe({})).toEqual({
      openrouter: "https://api.qronos.me/v1",
      gateway: "https://api.qronos.me/v1/",
      router: "https://api.qronos.me/v1/",
      audio: "https://api.qronos.me/v1/audio/transcriptions",
      fim: "https://api.qronos.me/v1/fim/completions",
      calls: [
        "https://api.qronos.me/v1/models",
        "https://api.qronos.me/v1/organizations/org-1/models",
        "https://api.qronos.me/v1/transcription-models",
        "https://api.qronos.me/v1/embedding-models",
      ],
    })
  })

  test("routes through QRONOS_API_URL/api/gateway/v1 when only QRONOS_API_URL is set", () => {
    expect(probe({ QRONOS_API_URL: "http://localhost:3000" })).toEqual({
      openrouter: "http://localhost:3000/api/gateway/v1",
      gateway: "http://localhost:3000/api/gateway/v1/",
      router: "http://localhost:3000/api/gateway/v1/",
      audio: "http://localhost:3000/api/gateway/v1/audio/transcriptions",
      fim: "http://localhost:3000/api/gateway/v1/fim/completions",
      calls: [
        "http://localhost:3000/api/gateway/v1/models",
        "http://localhost:3000/api/gateway/v1/organizations/org-1/models",
        "http://localhost:3000/api/gateway/v1/transcription-models",
        "http://localhost:3000/api/gateway/v1/embedding-models",
      ],
    })
  })

  test("routes gateway traffic to QRONOS_AI_GATEWAY_URL when both are set", () => {
    expect(probe({ QRONOS_API_URL: "http://localhost:3000", QRONOS_AI_GATEWAY_URL: "http://localhost:3001/gw/" })).toEqual({
      openrouter: "http://localhost:3001/gw",
      gateway: "http://localhost:3001/gw/",
      router: "http://localhost:3001/gw/",
      audio: "http://localhost:3001/gw/audio/transcriptions",
      fim: "http://localhost:3001/gw/fim/completions",
      calls: [
        "http://localhost:3001/gw/models",
        "http://localhost:3001/gw/organizations/org-1/models",
        "http://localhost:3001/gw/transcription-models",
        "http://localhost:3001/gw/embedding-models",
      ],
    })
  })
})

describe("Qronos API URL resolvers", () => {
  test("resolves the AI gateway root by default", () => {
    expect(resolveQronosGatewayBaseUrl()).toBe("https://api.qronos.me/v1/")
    expect(resolveQronosOpenRouterBaseUrl()).toBe("https://api.qronos.me/v1/")
    expect(resolveQronosGatewayUrl("fim/completions")).toBe("https://api.qronos.me/v1/fim/completions")
  })

  test("keeps the configured AI gateway base on the gateway root", () => {
    expect(resolveQronosOpenRouterBaseUrl({ baseURL: "https://api.qronos.me/v1/" })).toBe(
      "https://api.qronos.me/v1/",
    )
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://api.qronos.me/v1?x=1" })).toBe(
      "https://api.qronos.me/v1/",
    )
  })

  test("keeps legacy routing for custom base URLs that contain /api/v1", () => {
    expect(resolveQronosOpenRouterBaseUrl({ baseURL: "https://proxy.test/api/v1/custom" })).toBe(
      "https://proxy.test/api/openrouter/",
    )
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://proxy.test/dev/api/v1" })).toBe(
      "https://proxy.test/dev/api/gateway/",
    )
  })

  test("normalizes root API base overrides", () => {
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://example.test" })).toBe("https://example.test/api/gateway/")
    expect(resolveQronosOpenRouterBaseUrl({ baseURL: "https://example.test/" })).toBe(
      "https://example.test/api/openrouter/",
    )
  })

  test("replaces existing Qronos API route paths", () => {
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://example.test/api/openrouter/" })).toBe(
      "https://example.test/api/gateway/",
    )
    expect(resolveQronosOpenRouterBaseUrl({ baseURL: "https://example.test/api/gateway/" })).toBe(
      "https://example.test/api/openrouter/",
    )
  })

  test("preserves path prefixes before api", () => {
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://example.test/dev/api/openrouter/" })).toBe(
      "https://example.test/dev/api/gateway/",
    )
    expect(resolveQronosOpenRouterBaseUrl({ baseURL: "https://example.test/dev" })).toBe(
      "https://example.test/dev/api/openrouter/",
    )
  })

  test("strips search and hash components", () => {
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://example.test/api/openrouter/?x=1#frag" })).toBe(
      "https://example.test/api/gateway/",
    )
  })

  test("prefers token-derived URL when token contains one", () => {
    expect(resolveQronosGatewayBaseUrl({ baseURL: "https://fallback.test", token: "https://token.test:opaque" })).toBe(
      "https://token.test/api/gateway/",
    )
    expect(resolveQronosOpenRouterBaseUrl({ token: "https://token.test:opaque" })).toBe(
      "https://token.test/api/openrouter/",
    )
  })

  test("resolves child endpoint URLs", () => {
    expect(new URL("embedding-models", resolveQronosGatewayBaseUrl({ baseURL: "https://example.test" })).toString()).toBe(
      "https://example.test/api/gateway/embedding-models",
    )
  })
})
