import { describe, expect, test } from "bun:test"
import {
  hasQronosIndexingAuth,
  resolveQronosIndexingAuth,
  shouldDefaultIndexingToQronos,
} from "../../src/qronos/indexing-auth"

describe("Qronos indexing auth resolution", () => {
  test("detects auth from explicit indexing Qronos config", () => {
    const auth = resolveQronosIndexingAuth({
      config: { indexing: { qronos: { apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" } } },
    })

    expect(auth).toEqual({ apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" })
    expect(hasQronosIndexingAuth({ config: { indexing: { qronos: { apiKey: "idx-token" } } } })).toBe(true)
  })

  test("detects auth from provider config, provider state, auth storage, and env", () => {
    expect(
      resolveQronosIndexingAuth({ config: { provider: { qronos: { options: { apiKey: "cfg-token" } } } } }).apiKey,
    ).toBe("cfg-token")
    expect(resolveQronosIndexingAuth({ provider: { options: { qronosToken: "provider-token" } } }).apiKey).toBe(
      "provider-token",
    )
    expect(resolveQronosIndexingAuth({ auth: { type: "oauth", access: "oauth-token", accountId: "org_oauth" } })).toEqual(
      {
        apiKey: "oauth-token",
        organizationId: "org_oauth",
      },
    )
    expect(resolveQronosIndexingAuth({ env: { QRONOS_API_KEY: "env-token", QRONOS_ORG_ID: "org_env" } })).toEqual({
      apiKey: "env-token",
      organizationId: "org_env",
    })
  })

  test("defaults to Qronos only when no provider or other embedder config is present", () => {
    const auth = { apiKey: "qronos-token" }

    expect(shouldDefaultIndexingToQronos({}, auth)).toBe(true)
    expect(shouldDefaultIndexingToQronos({ provider: "openai" }, auth)).toBe(false)
    expect(shouldDefaultIndexingToQronos({ openai: { apiKey: "openai-key" } }, auth)).toBe(false)
    expect(shouldDefaultIndexingToQronos({ ollama: { baseUrl: "http://localhost:11434" } }, auth)).toBe(false)
  })
})
