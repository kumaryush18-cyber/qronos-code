import { type Component } from "solid-js"
import { ThemeProvider } from "@qronos-ai/ui-kit/theme"
import { DialogProvider } from "@qronos-ai/ui-kit/context/dialog"
import { Toast } from "@qronos-ai/ui-kit/toast"
import { MarketplaceView } from "../src/components/marketplace"
import { MarketplaceSessionProvider } from "../src/context/marketplace-session"
import { LanguageBridge } from "../src/context/language-bridge"
import { ServerProvider } from "../src/context/server"
import { VSCodeProvider } from "../src/context/vscode"
import "../src/styles/chat.css"

export const MarketplaceApp: Component = () => {
  return (
    <ThemeProvider defaultTheme="qronos-vscode">
      <DialogProvider>
        <VSCodeProvider>
          <ServerProvider>
            <LanguageBridge>
              <MarketplaceSessionProvider>
                <MarketplaceView />
              </MarketplaceSessionProvider>
            </LanguageBridge>
          </ServerProvider>
        </VSCodeProvider>
        <Toast.Region />
      </DialogProvider>
    </ThemeProvider>
  )
}
