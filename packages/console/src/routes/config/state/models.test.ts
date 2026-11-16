import { describe, expect, test } from "bun:test"
import { hasGateway, visible } from "./privacy"

describe("model privacy filter", () => {
  test("detects when Qronos Gateway models are present", () => {
    expect(hasGateway([{ id: "qronos" }, { id: "openai" }])).toBe(true)
    expect(hasGateway([{ id: "openai" }])).toBe(false)
  })

  test("shows every model when disabled", () => {
    expect(visible({ id: "qronos" }, { mayTrainOnYourPrompts: true }, false)).toBe(true)
  })

  test("hides only Qronos Gateway models explicitly marked for prompt training", () => {
    expect(visible({ id: "qronos" }, { mayTrainOnYourPrompts: true }, true)).toBe(false)
    expect(visible({ id: "qronos" }, { mayTrainOnYourPrompts: false }, true)).toBe(true)
    expect(visible({ id: "qronos" }, {}, true)).toBe(true)
    expect(visible({ id: "openai" }, { mayTrainOnYourPrompts: true }, true)).toBe(true)
  })
})
