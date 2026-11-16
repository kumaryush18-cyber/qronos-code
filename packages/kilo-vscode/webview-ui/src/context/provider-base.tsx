import type { ParentComponent } from "solid-js"
import { ThemeProvider } from "@qronos-ai/kilo-ui/theme"
import { DialogProvider } from "@qronos-ai/kilo-ui/context/dialog"
import { Toast } from "@qronos-ai/kilo-ui/toast"
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
    <ThemeProvider defaultTheme="kilo-vscode">
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
