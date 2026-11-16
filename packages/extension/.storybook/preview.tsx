/** @jsxImportSource solid-js */
import type { Preview, SolidRenderer } from "storybook-solidjs-vite"
import type { DecoratorFunction } from "storybook/internal/types"
// Reference qronos-ui stories helpers directly — not exported via package.json
import { applyQronosTheme, applyVscodeTheme, clearVscodeTheme } from "../../qronos-ui/src/stories/theme-decorator"
import "../../qronos-ui/.storybook/fonts.css"
import "@qronos-ai/ui-kit/styles"
import "../webview-ui/src/styles/chat.css"

// Make the Qronos logo available in Storybook (normally injected by the extension host)
;(window as { ICONS_BASE_URI?: string }).ICONS_BASE_URI = "/icons"

const themeDecorator: DecoratorFunction<SolidRenderer> = (Story, context) => {
  const themeId = (context.globals["theme"] as string) ?? "qronos-vscode"
  const vscodeThemeId = (context.globals["vscodeTheme"] as string) ?? "dark-modern"

  const colorScheme = (() => {
    if (themeId === "qronos-vscode") return applyVscodeTheme(vscodeThemeId)
    clearVscodeTheme()
    return (context.globals["colorScheme"] as "light" | "dark") ?? "dark"
  })()

  applyQronosTheme(themeId, colorScheme)
  document.body.style.background = "var(--background-base)"
  document.body.style.color = "var(--text-base)"
  return Story()
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
  decorators: [themeDecorator],
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "qronos-vscode", title: "Qronos VSCode" },
          { value: "qronos", title: "Qronos" },
        ],
        dynamicTitle: true,
      },
    },
    colorScheme: {
      description: "Color Scheme",
      toolbar: {
        title: "Color Scheme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
    vscodeTheme: {
      description: "VSCode Theme",
      toolbar: {
        title: "VSCode Theme",
        icon: "browser",
        items: [
          { value: "dark-modern", title: "Dark Modern (default)" },
          { value: "dark-plus", title: "Dark+" },
          { value: "light-modern", title: "Light Modern" },
          { value: "hc-black", title: "High Contrast Dark" },
          { value: "hc-light", title: "High Contrast Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "qronos-vscode",
    colorScheme: "dark",
    vscodeTheme: "dark-modern",
    a11y: { manual: true },
  },
}

export default preview
