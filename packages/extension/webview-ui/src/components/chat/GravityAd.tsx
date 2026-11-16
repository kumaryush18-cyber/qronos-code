import { Component, Show, createSignal, onMount } from "solid-js"
import { getVSCodeAPI } from "../../context/vscode"

// qronos_change - temporary: the slot is invisible when the gateway has no ad,
// so report the outcome to the extension log where it can be read afterwards.
function adDebug(text: string) {
  try {
    getVSCodeAPI().postMessage({ type: "qronosAdDebug", text } as any)
  } catch {
    // outside VS Code
  }
}

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
  const [ad, setAd] = createSignal<GravityAdData | null>(null)
  const [closed, setClosed] = createSignal(false)

  onMount(async () => {
    try {
      // qronos_change - use the same call as the Qronos signup card. That route
      // asks Gravity for the below_response placement and is the one that really
      // fills; the old GET /ads/next asked for inline_response, which Gravity
      // almost never fills for this publisher.
      const prompt = props.prompt?.slice(0, 200) || "Developer APIs, cloud databases, and AI coding tools"
      const res = await fetch("https://api.qronos.me/api/ads/gravity", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          placement: "below_response",
          placement_id: "main",
        }),
      })

      if (!res.ok) {
        adDebug(`http ${res.status}`)
        return
      }
      const raw = await res.json()
      adDebug(`ads=${Array.isArray(raw?.ads) ? raw.ads.length : 0} keys=${Object.keys(raw ?? {}).join(",")}`)
      // qronos_change - the Qronos ad gateway answers with a nested creative
      // object ({ creative: { headline, body, cta }, click_url, imp_url }).
      // Accept that shape as well as the flat one, otherwise every real ad was
      // dropped before it could be shown.
      const data: GravityAdData | null = raw?.ads?.[0]
        ? (raw.ads[0] as GravityAdData)
        : raw?.creative
        ? {
            brandName: raw.creative.headline,
            title: raw.creative.headline,
            adText: raw.creative.body ?? "",
            cta: raw.creative.cta,
            url: raw.click_url,
            clickUrl: raw.click_url,
            impUrl: raw.imp_url,
            isTest: raw.isTest,
          }
        : (raw as GravityAdData)
      if (data && data.adText && !data.isTest) {
        setAd(data)
        // Fire background impression tracker if present
        for (const tracker of [data.impUrl, raw?.imp_url]) {
          if (!tracker) continue
          fetch(tracker, { mode: "no-cors" }).catch(() => {})
        }
      }
    } catch {
      // Gracefully collapse on any network/ad fetch error
      setAd(null)
    }
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
