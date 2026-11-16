import { createBuiltinPlugins, type BuiltinTuiPlugin } from "@qronos-ai/tui/builtins"
import type { RuntimeFlags } from "@/effect/runtime-flags"
import { withQronosTuiPlugins } from "@/qronos/plugins/internal" // qronos_change

export type InternalTuiPlugin = BuiltinTuiPlugin

// qronos_change start
export function internalTuiPlugins(
  flags: Pick<RuntimeFlags.Info, "experimentalEventSystem" | "experimentalSessionSwitcher">,
): InternalTuiPlugin[] {
  return withQronosTuiPlugins(
    createBuiltinPlugins({
      experimentalEventSystem: flags.experimentalEventSystem,
    }),
    flags,
  )
  // qronos_change end
}
