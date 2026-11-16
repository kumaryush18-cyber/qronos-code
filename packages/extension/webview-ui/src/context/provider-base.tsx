import type { ParentComponent } from "solid-js"
import { ThemeProvider } from "@qronos-ai/ui-kit/theme"
import { DialogProvider } from "@qronos-ai/ui-kit/context/dialog"
import { Toast } from "@qronos-ai/ui-kit/toast"
import { VSCodeProvider } from "./vscode"
import { ServerProvider } from "./server"
import { LanguageBridge } from "./language-bridge"
import { ProviderProvider } from "./provider"
import { ConfigProvider } from "./config"
import { DisplayProvider } from "./display"
import { SpeechToTextPrewarm } from "../components/speech-to-text/SpeechToTextPrewarm"

export const Base: ParentComponent<{ content?: ParentComponent }> = (props) => {
  const Content = props.content ?? ((props) => props.children)
  return (
    <ThemeProvider defaultTheme="qronos-vscode">
      <DialogProvider>
        <VSCodeProvider>
          <ServerProvider>
            <LanguageBridge>
              <Content>
                <ProviderProvider>
                  <ConfigProvider>
                    <SpeechToTextPrewarm />
                    <DisplayProvider>{props.children}</DisplayProvider>
                  </ConfigProvider>
                </ProviderProvider>
              </Content>
            </LanguageBridge>
          </ServerProvider>
        </VSCodeProvider>
        <Toast.Region />
      </DialogProvider>
    </ThemeProvider>
  )
}
