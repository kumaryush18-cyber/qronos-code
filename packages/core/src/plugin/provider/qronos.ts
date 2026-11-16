import { createQronos, QRONOS_OPENROUTER_BASE } from "@qronos-ai/gateway" // qronos_change
import { Effect } from "effect"
import { ProviderV2 } from "../../provider" // qronos_change
import { define } from "../internal"

const id = ProviderV2.ID.qronos // qronos_change

export const QronosPlugin = define({
  id: "qronos",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.catalog.transform(
      Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.id !== id) continue // qronos_change
          evt.provider.update(item.provider.id, (provider) => {
            // qronos_change start
            const options = provider.request.body
            const token = options.qronosToken ?? options.apiKey ?? process.env.QRONOS_API_KEY ?? process.env.QRONOS_API_KEY
            const org = process.env.QRONOS_ORG_ID ?? options.qronosOrganizationId

            provider.api = {
              type: "aisdk",
              package: "@qronos-ai/gateway",
              url: QRONOS_OPENROUTER_BASE,
            }
            // qronos_change end
            provider.request.headers["HTTP-Referer"] = "https://qronos.me/"
            // qronos_change start
            provider.request.headers["X-Title"] = "Qronos Code"
            options.apiKey = token ?? "anonymous"
            options.qronosToken = options.apiKey
            if (org) options.qronosOrganizationId = org
            // qronos_change end
          })
        }
      }),
    )
    // qronos_change start
    yield* ctx.aisdk.sdk(
      Effect.fn(function* (evt) {
        if (evt.model.providerID !== id) return
        evt.sdk = createQronos(evt.options)
      }),
    )
    // qronos_change end
  }),
})
