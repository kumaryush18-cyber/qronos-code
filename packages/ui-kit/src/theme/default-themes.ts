import type { DesktopTheme } from "@qronos-ai/ui/theme/types"
import { DEFAULT_THEMES as UPSTREAM_THEMES } from "@qronos-ai/ui/theme/default-themes"
import qronosJson from "./themes/qronos.json"
import qronosVscodeJson from "./themes/qronos-vscode.json"

// Re-export all upstream theme constants
export {
  oc2Theme,
  tokyonightTheme,
  draculaTheme,
  monokaiTheme,
  solarizedTheme,
  nordTheme,
  catppuccinTheme,
  ayuTheme,
  oneDarkProTheme,
  shadesOfPurpleTheme,
  nightowlTheme,
  vesperTheme,
  carbonfoxTheme,
  gruvboxTheme,
  auraTheme,
} from "@qronos-ai/ui/theme/default-themes"

export const qronosTheme = qronosJson as DesktopTheme
export const qronosVscodeTheme = qronosVscodeJson as DesktopTheme

export const QRONOS_THEMES: Record<string, DesktopTheme> = {
  qronos: qronosTheme,
  "qronos-vscode": qronosVscodeTheme,
}

// Override DEFAULT_THEMES: Qronos themes first, then upstream
export const DEFAULT_THEMES: Record<string, DesktopTheme> = {
  ...QRONOS_THEMES,
  ...UPSTREAM_THEMES,
}
