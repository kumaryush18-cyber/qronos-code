export type {
  DesktopTheme,
  ThemeSeedColors,
  ThemeVariant,
  HexColor,
  OklchColor,
  ResolvedTheme,
  ColorValue,
  CssVarRef,
} from "@qronos-ai/ui/theme/types"

export {
  hexToRgb,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  rgbToOklch,
  oklchToRgb,
  generateScale,
  generateNeutralScale,
  generateAlphaScale,
  mixColors,
  lighten,
  darken,
  withAlpha,
} from "@qronos-ai/ui/theme/color"

export { resolveThemeVariant, resolveTheme, themeToCss } from "@qronos-ai/ui/theme/resolve"
export { applyTheme, loadThemeFromUrl, getActiveTheme, removeTheme, setColorScheme } from "@qronos-ai/ui/theme/loader"

// Override: use our context with qronos default
export { ThemeProvider, useTheme, type ColorScheme } from "./context"

// Override: use our default-themes which includes Qronos themes
export {
  DEFAULT_THEMES,
  qronosTheme,
  qronosVscodeTheme,
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
} from "./default-themes"
