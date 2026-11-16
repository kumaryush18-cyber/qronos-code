import { SessionV1 } from "@qronos-ai/core/v1/session"
import { Effect } from "effect"
import { Agent } from "@/agent/agent"
import { QronosModeReminders } from "@/qronos/session/mode-reminders" // qronos_change
import { Session } from "./session"

export const apply = Effect.fn("SessionReminders.apply")(function* (input: {
  messages: SessionV1.WithParts[]
  agent: Agent.Info
  session: Session.Info
}) {
  // qronos_change start - mode reminder policy (plan, ask, code switches) lives in qronos/session/mode-reminders.ts
  return yield* QronosModeReminders.apply(input)
  // qronos_change end
})

export * as SessionReminders from "./reminders"
