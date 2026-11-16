import { Component, Show, createSignal, onMount, onCleanup } from "solid-js"
import { useVSCode } from "../../context/vscode"

export interface GravityAdData {
  brandName?: string
  title?: string
  adText: string
  cta?: string
  url?: string
  clickUrl?: string
  impUrl?: string
  favicon?: string
  isTest?: boolean
}

interface GravityAdProps {
  prompt?: string
}

export const GravityAd: Component<GravityAdProps> = (props) => {
  const vscode = useVSCode()
  const [ad, setAd] = createSignal<GravityAdData | null>(null)
  const [closed, setClosed] = createSignal(false)

  onMount(() => {
    // qronos_change - the extension host performs the request, because a
    // cross-origin POST from the panel is blocked by CORS before it is sent.
    vscode.postMessage({ type: "qronosAdRequest", prompt: props.prompt })
    const stop = vscode.onMessage((msg) => {
      if (msg.type !== "qronosAdResult") return
      const result = msg.ad
      if (!result || !result.adText) return
      setAd({ ...result, url: result.clickUrl } as GravityAdData)
      if (result.impUrl) fetch(result.impUrl, { mode: "no-cors" }).catch(() => {})
    })
    onCleanup(stop)
  })

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    const targetUrl = ad()?.clickUrl || ad()?.url
    if (targetUrl) {
      window.open(targetUrl, "_blank")
    }
  }

  return (
    <Show when={ad() && !closed()}>
      <div
        class="qronos-gravity-ad-card"
        style={{
          margin: "12px 0 6px 0",
          padding: "10px 14px",
          background: "var(--vscode-editorWidget-background, rgba(255, 107, 0, 0.04))",
          border: "1px solid rgba(255, 107, 0, 0.22)",
          "border-radius": "6px",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
        onClick={handleClick}
      >
        <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "margin-bottom": "4px" }}>
          <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
            <Show when={ad()?.favicon}>
              <img src={ad()!.favicon} alt="" style={{ width: "14px", height: "14px", "border-radius": "2px" }} />
            </Show>
            <span style={{ "font-size": "var(--font-size-x-small, 11px)", "font-weight": "600", color: "#FF6B00" }}>
              {ad()?.brandName || "Featured Partner"}
            </span>
            <span
              style={{
                "font-size": "var(--font-size-x-small, 9px)",
                padding: "1px 5px",
                background: "rgba(255, 107, 0, 0.15)",
                color: "#FF8C2A",
                "border-radius": "3px",
                "text-transform": "uppercase",
                "letter-spacing": "0.5px",
              }}
            >
              Sponsored
            </span>
          </div>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--vscode-descriptionForeground, #888)",
              cursor: "pointer",
              "font-size": "var(--font-size-x-small, 13px)",
              padding: "0 2px",
            }}
            onClick={(e) => {
              e.stopPropagation()
              setClosed(true)
            }}
            title="Dismiss ad"
          >
            ×
          </button>
        </div>

        <Show when={ad()?.title}>
          <div style={{ "font-size": "var(--font-size-x-small, 12px)", "font-weight": "500", "margin-bottom": "2px", color: "var(--vscode-foreground)" }}>
            {ad()!.title}
          </div>
        </Show>

        <div style={{ "font-size": "var(--font-size-x-small, 11px)", color: "var(--vscode-descriptionForeground, #aaa)", "line-height": "1.4" }}>
          {ad()!.adText}
        </div>

        <div style={{ "margin-top": "6px", display: "flex", "justify-content": "flex-end" }}>
          <span
            style={{
              "font-size": "var(--font-size-x-small, 10px)",
              color: "#FF6B00",
              "font-weight": "600",
              display: "inline-flex",
              "align-items": "center",
              gap: "3px",
            }}
          >
            {ad()?.cta || "Learn More"} ❯
          </span>
        </div>
      </div>
    </Show>
  )
}
