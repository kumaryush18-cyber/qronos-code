import { createMemo, Match, Switch, type JSX } from "solid-js"
import { SplitBorder } from "@tui/ui/border"
import { useTheme } from "@tui/context/theme"
import { parseQronosErrorCode, qronosErrorTitle, qronosErrorDescription } from "@/qronos/qronos-errors"
import type { AssistantMessage } from "@qronos-ai/sdk/v2"

interface QronosErrorBlockProps {
  error: NonNullable<AssistantMessage["error"]>
  fallback: JSX.Element
}

export function QronosErrorBlock(props: QronosErrorBlockProps) {
  const { theme } = useTheme()

  const qronosErrorCode = createMemo(() => {
    return parseQronosErrorCode(props.error)
  })

  const title = createMemo(() => {
    const code = qronosErrorCode()
    return code ? qronosErrorTitle(code) : undefined
  })

  const description = createMemo(() => {
    const code = qronosErrorCode()
    return code ? qronosErrorDescription(code) : undefined
  })

  return (
    <Switch fallback={props.fallback}>
      <Match when={qronosErrorCode()}>
        <box
          border={["left"]}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          marginTop={1}
          backgroundColor={theme.backgroundPanel}
          customBorderChars={SplitBorder.customBorderChars}
          borderColor={theme.primary}
        >
          <text fg={theme.text}>{title()}</text>
          <text fg={theme.textMuted}>{description()}</text>
          <text fg={theme.primary}>{"Run /connect or `qronos auth login` to connect to Qronos Gateway"}</text>
        </box>
      </Match>
    </Switch>
  )
}
