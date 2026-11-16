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
        padding: "16px",
        background: "#0c0d10",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        "border-radius": "12px",
        "text-align": "center",
        width: "100%",
        "max-width": "340px",
        "box-sizing": "border-box",
        "box-shadow": "0 8px 24px rgba(0, 0, 0, 0.6)",
      }}
    >
      <Show
        when={token()}
        fallback={
          <div>
            <div style={{ "font-size": "14px", "font-weight": "700", color: "#FFFFFF", "margin-bottom": "4px" }}>
              Connect Qronos AI Account
            </div>
            <div
              style={{
                "font-size": "11px",
                color: "#8E9298",
                "margin-bottom": "14px",
                "line-height": "1.4",
              }}
            >
              10,000,000 free tokens refreshed daily at midnight UTC
            </div>
            <button
              type="button"
              class="qronos-starlight-btn"
              onClick={() => vscode.postMessage({ type: "qronosSignIn" })}
            >
              <div class="qronos-starlight-btn-inner">
                <span>⚡ Sign In with GitHub Device Flow</span>
              </div>
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#E2E8F0",
                padding: "7px 10px",
                "border-radius": "6px",
                "font-size": "11px",
                cursor: "pointer",
                width: "100%",
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
              onClick={() => vscode.postMessage({ type: "qronosSetApiKey" })}
            >
              Enter API Key (qr_...)
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", "flex-direction": "column", "align-items": "center", gap: "4px" }}>
          <div style={{ "font-size": "12px", "font-weight": "700", color: "#22C55E", display: "flex", "align-items": "center", gap: "4px" }}>
            ✓ 10M Daily Tokens Active
          </div>
          <div style={{ "font-size": "11px", color: "#8E9298" }}>
            Connected to Qronos AI Universal Gateway
          </div>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              "text-decoration": "underline",
              "font-size": "11px",
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
