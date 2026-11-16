import { expect, test } from "bun:test"
import { QronosSteer } from "../../src/qronos/steer"

const child = {
  parentID: "ses_parent",
  agent: "explore",
  model: { id: "sub-model", providerID: "sub", variant: "high" },
}
const root = { agent: "code", model: { id: "main-model", providerID: "main" } }

test("a steering prompt keeps the child's agent, model, and variant", () => {
  expect(QronosSteer.prompt(child)).toEqual({
    agent: "explore",
    model: { providerID: "sub", modelID: "sub-model" },
    variant: "high",
  })
})

test("primary sessions keep the current selection", () => {
  for (const session of [root, undefined]) {
    expect(QronosSteer.prompt(session)).toEqual({})
    expect(QronosSteer.mark(session)).toEqual({})
    expect(QronosSteer.steering(session)).toBe(false)
  }
})

test("a default child variant clears the primary variant instead of inheriting it", () => {
  const plain = { ...child, model: { ...child.model, variant: "default" } }
  expect(QronosSteer.prompt(plain)).toEqual({
    agent: "explore",
    model: { providerID: "sub", modelID: "sub-model" },
    variant: undefined,
  })
})

test("only subagent text is marked as a human steer", () => {
  expect(QronosSteer.mark(child)).toEqual({ metadata: { kind: "subagent_steer" } })
  expect(QronosSteer.steering(child)).toBe(true)
})

test("subagent views accept input only while the child is running", () => {
  expect(QronosSteer.open(child, "busy")).toBe(true)
  expect(QronosSteer.open(child, "retry")).toBe(true)
  expect(QronosSteer.open(child, "idle")).toBe(false)
  expect(QronosSteer.open(child, undefined)).toBe(false)
  expect(QronosSteer.open(root, "idle")).toBe(true)
})

test("subagent-view keys yield only once the focused prompt has text", () => {
  expect(QronosSteer.idle(undefined)).toBe(true)
  expect(QronosSteer.idle({ focused: false, current: { input: "draft" } })).toBe(true)
  expect(QronosSteer.idle({ focused: true, current: { input: "" } })).toBe(true)
  expect(QronosSteer.idle({ focused: true, current: { input: "draft" } })).toBe(false)
})

test("the steered agent comes from the session, then its latest reply, then the task title", () => {
  const title = "inspect bug (@explore subagent)"
  expect(QronosSteer.agent({ agent: "general", title }, "build")).toBe("general")
  expect(QronosSteer.agent({ title }, "build")).toBe("build")
  expect(QronosSteer.agent({ title })).toBe("explore")
  expect(QronosSteer.agent({ title: "untitled" })).toBeUndefined()
  expect(QronosSteer.agent(undefined)).toBeUndefined()
})

test("the steered model shows display names and falls back to raw ids", () => {
  const providers = [{ id: "sub", name: "Sub Provider", models: { "sub-model": { name: "Sub Model" } } }]
  expect(QronosSteer.model({ id: "sub-model", providerID: "sub" }, providers)).toEqual({
    name: "Sub Model",
    provider: "Sub Provider",
  })
  expect(QronosSteer.model({ id: "gone", providerID: "missing" }, providers)).toEqual({
    name: "gone",
    provider: "missing",
  })
  expect(QronosSteer.model(undefined, providers)).toBeUndefined()
})
