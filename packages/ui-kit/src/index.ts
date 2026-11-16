//
// @qronos-ai/ui-kit
//
// Theme and style override layer for @qronos-ai/ui that matches the
// visual style of the legacy Qronos Code VS Code extension.
//
// Two themes are provided:
// - qronos:        For web/desktop (light + dark variants from legacy VS Code themes) [DEFAULT]
// - qronos-vscode: For the VS Code extension (adapts to user's VS Code theme)
//
// This package mirrors @qronos-ai/ui's structure exactly. All component imports
// are re-exported from @qronos-ai/ui by default, and can be individually overridden
// by replacing the re-export with a custom implementation.

export { QRONOS_THEMES, qronosTheme, qronosVscodeTheme } from "./theme/default-themes"

export type { DesktopTheme } from "@qronos-ai/ui/theme/types"
