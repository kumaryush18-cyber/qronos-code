import { Component, Show, createSignal, onMount, onCleanup } from "solid-js"
import { useVSCode } from "../../context/vscode"

export const QronosAuthBanner: Component = () => {
  const vscode = useVSCode()
  const [token, setToken] = createSignal<string | null>(null)
  const [user, setUser] = createSignal<any>(null)

  onMount(() => {
    // Request current auth state from extension backend
    vscode.postMessage({ type: "qronosGetSession" })

    const unsubscribe = vscode.onMessage((msg: any) => {
      if (msg.type === "qronosAuthSuccess" || msg.type === "qronosSession") {
        if (msg.session?.token) {
          setToken(msg.session.token)
          setUser(msg.session.user || msg.session)
        }
      }
      if (msg.type === "qronosSignedOut") {
        setToken(null)
        setUser(null)
      }
    })

    onCleanup(unsubscribe)
  })

  return (
    <div
      class="qronos-auth-banner"
      style={{
        margin: "12px 0 16px 0",
        padding: "12px 14px",
        background: "rgba(255, 107, 0, 0.08)",
        border: "1px solid rgba(255, 107, 0, 0.35)",
        "border-radius": "8px",
        "text-align": "center",
        width: "100%",
        "max-width": "340px",
        "box-sizing": "border-box",
      }}
    >
      <Show
        when={token()}
        fallback={
          <div>
            <div style={{ "font-size": "var(--font-size-x-small, 13px)", "font-weight": "700", color: "#FF6B00", "margin-bottom": "4px" }}>
              ⚡ Connect Qronos AI Account
            </div>
            <div
              style={{
                "font-size": "var(--font-size-x-small, 11px)",
                color: "var(--vscode-descriptionForeground, #aaa)",
                "margin-bottom": "10px",
                "line-height": "1.3",
              }}
            >
              10,000,000 free tokens refreshed daily at midnight UTC
            </div>
            <button
              type="button"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#FF6B00",
                color: "#FFFFFF",
                border: "none",
                "border-radius": "4px",
                "font-weight": "600",
                "font-size": "var(--font-size-x-small, 12px)",
                cursor: "pointer",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                gap: "6px",
                "margin-bottom": "6px",
              }}
              onClick={() => vscode.postMessage({ type: "qronosSignIn" })}
            >
              ⚡ Sign In with GitHub Device Flow
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 107, 0, 0.4)",
                color: "#FFA032",
                padding: "5px 10px",
                "border-radius": "4px",
                "font-size": "var(--font-size-x-small, 11px)",
                cursor: "pointer",
                width: "100%",
              }}
              onClick={() => vscode.postMessage({ type: "qronosSetApiKey" })}
            >
              Enter API Key (qr_...)
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", "flex-direction": "column", "align-items": "center", gap: "4px" }}>
          <div style={{ "font-size": "var(--font-size-x-small, 12px)", "font-weight": "700", color: "#22C55E", display: "flex", "align-items": "center", gap: "4px" }}>
            ✓ 10M Daily Tokens Active
          </div>
          <div style={{ "font-size": "var(--font-size-x-small, 11px)", color: "var(--vscode-descriptionForeground, #aaa)" }}>
            Connected to Qronos AI Universal Gateway
          </div>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#FF6B00",
              "text-decoration": "underline",
              "font-size": "var(--font-size-x-small, 11px)",
              cursor: "pointer",
              "margin-top": "6px",
            }}
            onClick={() => vscode.postMessage({ type: "qronosSignOut" })}
          >
            Sign out
          </button>
        </div>
      </Show>
    </div>
  )
}
