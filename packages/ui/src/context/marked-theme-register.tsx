import { registerCustomTheme } from "@pierre/diffs"
import { OpenCodeTheme } from "./marked-theme"

let registered = false

export function registerOpenCodeTheme() {
  if (registered) return
  registered = true
  registerCustomTheme("Qronos", () => Promise.resolve(OpenCodeTheme))
}
