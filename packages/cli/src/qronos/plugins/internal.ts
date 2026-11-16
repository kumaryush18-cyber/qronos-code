import type { BuiltinTuiPlugin } from "@qronos-ai/tui/builtins"
import HomeNews from "@/qronos/plugins/home-news"
import HomeOnboarding from "@/qronos/plugins/home-onboarding"
import Attention from "@/qronos/plugins/attention"
import HomeFooter from "@/qronos/plugins/home-footer"
import Permissions from "@/qronos/plugins/permissions"
import SidebarFooter from "@/qronos/plugins/sidebar-footer"
import MemoryStatus from "@/qronos/plugins/memory-status"
import MemoryPalette from "@/qronos/plugins/memory-palette"
import SidebarProcesses from "@/qronos/plugins/sidebar-background-processes"
import SidebarIndexing from "@/qronos/plugins/sidebar-indexing"
import SidebarPr from "@/qronos/plugins/sidebar-pr"
import SidebarUsage from "@/qronos/plugins/sidebar-usage"
import Sandbox from "@/qronos/plugins/sandbox"
import Remote from "@/qronos/plugins/remote"
import Reload from "@/qronos/plugins/reload"
import SessionSwitcher from "@/qronos/plugins/session-switcher"
import SessionV2Debug from "@/qronos/plugins/session-v2-debug"
import type { RuntimeFlags } from "@/effect/runtime-flags"

const plugins = [
  HomeNews,
  HomeOnboarding,
  Attention,
  HomeFooter,
  Permissions,
  SidebarFooter,
  MemoryStatus,
  MemoryPalette,
  SidebarProcesses,
  SidebarIndexing,
  SidebarPr,
  SidebarUsage,
  Sandbox,
  Remote,
  Reload,
] satisfies BuiltinTuiPlugin[]

export function withQronosTuiPlugins(
  builtins: BuiltinTuiPlugin[],
  flags: Pick<RuntimeFlags.Info, "experimentalEventSystem" | "experimentalSessionSwitcher">,
) {
  return [
    ...plugins,
    ...(flags.experimentalEventSystem ? [SessionV2Debug] : []),
    ...(flags.experimentalSessionSwitcher ? [SessionSwitcher] : []),
    ...builtins,
  ]
}
