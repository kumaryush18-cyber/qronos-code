//
// @qronos-ai/kilo-ui
//
// Theme and style override layer for @qronos-ai/ui that matches the
// visual style of the legacy Kilo Code VS Code extension.
//
// Two themes are provided:
// - kilo:        For web/desktop (light + dark variants from legacy VS Code themes) [DEFAULT]
// - kilo-vscode: For the VS Code extension (adapts to user's VS Code theme)
//
// This package mirrors @qronos-ai/ui's structure exactly. All component imports
// are re-exported from @qronos-ai/ui by default, and can be individually overridden
// by replacing the re-export with a custom implementation.

export { KILO_THEMES, kiloTheme, kiloVscodeTheme } from "./theme/default-themes"

export type { DesktopTheme } from "@qronos-ai/ui/theme/types"
