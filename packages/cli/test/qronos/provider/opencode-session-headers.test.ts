import { describe, expect, test } from "bun:test"
import { qronosSessionHeaders } from "@/qronos/provider/opencode-session-headers"

describe("opencodeSessionHeaders", () => {
  test("attaches x-opencode-session for opencode-managed providers", () => {
    const headers = qronosSessionHeaders({ providerID: "opencode", sessionID: "ses_abc" })
    expect(headers["x-opencode-session"]).toBe("ses_abc")
  })

  test("matches any opencode-prefixed provider id (e.g. opencode-go)", () => {
    const headers = qronosSessionHeaders({ providerID: "opencode-go", sessionID: "ses_abc" })
    expect(headers["x-opencode-session"]).toBe("ses_abc")
  })

  test("returns no headers for non-opencode providers", () => {
    const headers = qronosSessionHeaders({ providerID: "anthropic", sessionID: "ses_abc" })
    expect(headers).toEqual({})
  })

  test("returns no headers for providers that merely contain the word opencode", () => {
    const headers = qronosSessionHeaders({ providerID: "my-opencode-proxy", sessionID: "ses_abc" })
    expect(headers).toEqual({})
  })
})
