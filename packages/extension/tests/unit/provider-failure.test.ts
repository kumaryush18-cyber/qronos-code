import { describe, expect, it } from "bun:test"
import { providerFailure, providerFailureMessageKey, providerFailureNeedsSignIn } from "../../src/shared/provider-model"

describe("providerFailureMessageKey", () => {
  it("selects the status-bearing keys when a status is present", () => {
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "unauthorized", status: 401 })).toEqual({
      key: "provider.failure.unauthorized",
      vars: { status: 401 },
    })
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "http", status: 503 })).toEqual({
      key: "provider.failure.http",
      vars: { status: 503 },
    })
  })

  it("selects the no-status keys when a status is absent", () => {
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "unauthorized" })).toEqual({
      key: "provider.failure.unauthorizedNoStatus",
    })
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "http" })).toEqual({
      key: "provider.failure.httpNoStatus",
    })
  })

  it("maps the status-less kinds directly", () => {
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "unauthenticated" })).toEqual({
      key: "provider.failure.unauthenticated",
    })
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "network" })).toEqual({
      key: "provider.failure.network",
    })
    expect(providerFailureMessageKey({ providerID: "qronos", kind: "schema" })).toEqual({
      key: "provider.failure.schema",
    })
  })
})

describe("providerFailure", () => {
  it("finds the failure for the matching provider", () => {
    const failures = [
      { providerID: "other", kind: "network" as const },
      { providerID: "qronos", kind: "unauthorized" as const, status: 401 },
    ]
    expect(providerFailure("qronos", failures)).toEqual({ providerID: "qronos", kind: "unauthorized", status: 401 })
  })

  it("returns undefined when the provider has no failure", () => {
    expect(providerFailure("qronos", [{ providerID: "other", kind: "network" as const }])).toBeUndefined()
  })
})

describe("providerFailureNeedsSignIn", () => {
  it("offers sign-in only for credential failures", () => {
    expect(providerFailureNeedsSignIn({ providerID: "qronos", kind: "unauthorized" })).toBe(true)
    expect(providerFailureNeedsSignIn({ providerID: "qronos", kind: "unauthenticated" })).toBe(true)
    expect(providerFailureNeedsSignIn({ providerID: "qronos", kind: "network" })).toBe(false)
    expect(providerFailureNeedsSignIn({ providerID: "qronos", kind: "http", status: 503 })).toBe(false)
    expect(providerFailureNeedsSignIn({ providerID: "qronos", kind: "schema" })).toBe(false)
  })
})
