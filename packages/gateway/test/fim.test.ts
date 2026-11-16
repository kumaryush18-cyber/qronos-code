import { describe, expect, test } from "bun:test"
import { resolveFimTarget } from "../src/fim"

describe("FIM target resolution", () => {
  test("keeps gateway autocomplete models on Qronos Gateway", () => {
    expect(resolveFimTarget("qronos", "mistralai/codestral-2508")).toEqual({
      provider: "qronos",
      model: "mistralai/codestral-2508",
      url: "https://api.qronos.me/v1/fim/completions",
    })
  })

  test("routes explicit provider autocomplete models directly", () => {
    expect(resolveFimTarget("mistral", "codestral-2508")).toEqual({
      provider: "mistral",
      model: "codestral-2508",
    })
  })

  test("falls back to the default Gateway model for retired direct providers", () => {
    expect(resolveFimTarget("inception", "mercury-edit-2")).toEqual({
      provider: "qronos",
      model: "mistralai/codestral-2508",
      url: "https://api.qronos.me/v1/fim/completions",
    })
  })

  test("preserves gateway model pass-through behavior", () => {
    expect(resolveFimTarget()).toEqual({
      provider: "qronos",
      model: "mistralai/codestral-2508",
      url: "https://api.qronos.me/v1/fim/completions",
    })
    expect(resolveFimTarget(undefined, "mistralai/codestral-2508")).toEqual({
      provider: "qronos",
      model: "mistralai/codestral-2508",
      url: "https://api.qronos.me/v1/fim/completions",
    })
    expect(resolveFimTarget("qronos", "custom/fim-model")).toEqual({
      provider: "qronos",
      model: "custom/fim-model",
      url: "https://api.qronos.me/v1/fim/completions",
    })
  })
})
