import type { Hooks } from "@qronos-ai/plugin"
import * as Log from "@qronos-ai/core/util/log" // qronos_change
import { ModalModels } from "./models"

const log = Log.create({ service: "plugin.modal" }) // qronos_change

export async function ModalPlugin(): Promise<Hooks> {
  return {
    provider: {
      id: "modal",
      async models(provider, ctx) {
        const apiKey = ctx.auth?.type === "api" ? ctx.auth.key : process.env.MODAL_PROXY_TOKEN
        const baseURL = Object.values(provider.models)[0]?.api.url
        if (!apiKey || !baseURL) return provider.models // qronos_change - preserve catalog models without discovery credentials

        // qronos_change start - transient discovery failures must not erase the existing catalog
        return ModalModels.get(baseURL, apiKey, provider.models).catch((err) => {
          log.warn("modal model discovery failed", { err })
          return provider.models
        })
        // qronos_change end
      },
    },
  }
}
