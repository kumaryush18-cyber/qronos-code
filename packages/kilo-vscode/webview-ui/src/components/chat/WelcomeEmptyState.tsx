import { type Component, type JSX, createSignal, For, Show } from "solid-js"
import { Icon } from "@kilocode/kilo-ui/icon"
import { useDialog } from "@kilocode/kilo-ui/context/dialog"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"
import { recentSessions } from "../../context/session-utils"
import type { SessionInfo } from "../../types/messages"
import { formatRelativeDate } from "../../utils/date"
import { FeedbackDialog } from "./FeedbackDialog"
import { WorkspaceScopeHint } from "./WorkspaceScopeHint"
import { QronosAuthBanner } from "./QronosAuthBanner"

interface WelcomeEmptyStateProps {
  sessions?: () => SessionInfo[]
  onSelectSession?: (id: string) => void
  onShowHistory?: () => void
  footer?: JSX.Element
}

/**
 * Square Qronos mark. Hover rotates the mark and crossfades to the yellow Lottie animation,
 * matching the Qronos Cloud header logo. The player mounts on first hover so the WASM renderer
 * never delays the empty state; the static mark stays visible until the player can draw, so a
 * slow or failed load never leaves an empty square.
 */
export const KiloLogo = () => {
  const icons = (window as { ICONS_BASE_URI?: string }).ICONS_BASE_URI || ""
  return (
    <div class="qronos-logo-frame">
      <img src={`${icons}/qronos-logo.png`} alt="Qronos Code" />
    </div>
  )
}

export const WelcomeEmptyState: Component<WelcomeEmptyStateProps> = (props) => {
  const session = useSession()
  const language = useLanguage()
  const dialog = useDialog()
  const recent = () => recentSessions(props.sessions?.() ?? session.sessions())

  return (
    <div class="message-list-empty">
      <KiloLogo />
      <h1
        style={{
          margin: "12px 0 6px 0",
          "font-size": "26px",
          "font-weight": "800",
          color: "#FFFFFF",
          "letter-spacing": "-0.03em",
          "text-align": "center",
        }}
      >
        Qronos Code
      </h1>
      <p class="kilo-about-text" style={{ color: "#8E9298", margin: "0 0 16px 0" }}>
        Autonomous AI coding agent in your editor, powered by Qronos AI.
      </p>
      <QronosAuthBanner />
      <WorkspaceScopeHint />
      <Show when={recent().length > 0 && props.onSelectSession}>
        <div class="recent-sessions">
          <span class="recent-sessions-label">{language.t("session.recent")}</span>
          <For each={recent()}>
            {(item) => (
              <button class="recent-session-item" onClick={() => props.onSelectSession?.(item.id)}>
                <span class="recent-session-title" dir="auto">
                  {item.title || language.t("session.untitled")}
                </span>
                <span class="recent-session-date">{formatRelativeDate(item.updatedAt)}</span>
              </button>
            )}
          </For>
          <Show when={props.onShowHistory}>
            <button class="show-history-btn" onClick={() => props.onShowHistory?.()}>
              <Icon name="history" size="small" />
              {language.t("session.showHistory")}
            </button>
          </Show>
        </div>
      </Show>
      <button class="feedback-button" onClick={() => dialog.show(() => <FeedbackDialog />)}>
        <Icon name="bubble-5" size="small" />
        {language.t("feedback.button")}
      </button>
      {props.footer}
    </div>
  )
}
