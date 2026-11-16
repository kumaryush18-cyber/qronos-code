import { run as runTui, type TuiInput } from "@qronos-ai/tui"
import { Global } from "@qronos-ai/core/global"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
