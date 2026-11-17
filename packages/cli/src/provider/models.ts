// qronos_change - new file
import { Config } from "@/config/config"
import { Auth } from "@/auth"
import { ModelCache } from "./model-cache"
import * as Core from "@qronos-ai/core/models-dev"
import { Context, Effect, Layer } from "effect"
import { AI_SDK_PROVIDERS, QRONOS_OPENROUTER_BASE, PROMPTS } from "@qronos-ai/gateway"
import { overlay } from "@/qronos/anaconda-desktop/provider"
import { compatible, organization, token } from "@/qronos/provider/catalog"
import { LayerNode } from "@qronos-ai/core/effect/layer-node"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder" // qronos_change

export const Model = Core.Model
export type Model = Core.Model
export const Provider = Core.Provider
export type Provider = Core.Provider
export const CatalogModelStatus = Core.CatalogModelStatus
export type CatalogModelStatus = Core.CatalogModelStatus

export interface Interface extends Core.Interface {
  readonly getFailure: ModelCache.Interface["getFailure"]
}

export class Service extends Context.Service<Service, Interface>()("@opencode/ModelsDev") {}

function baseURL(url: string | undefined, org: string | undefined) {
  if (!url) return
  const base = url.replace(/\/+$/, "")
  if (org) {
    if (base.includes("/api/organizations/")) return base
    if (base.endsWith("/api")) return `${base}/organizations/${org}`
    return `${base}/api/organizations/${org}`
  }
  if (base.includes("/openrouter")) return base
  if (base.endsWith("/api")) return `${base}/openrouter`
  return `${base}/api/openrouter`
}

export const layer: Layer.Layer<Service, never, Core.Service | Config.Service | Auth.Service | ModelCache.Service> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const core = yield* Core.Service
      const config = yield* Config.Service
      const auth = yield* Auth.Service
      const cache = yield* ModelCache.Service

      const get = Effect.fn("ModelsDev.get")(function* () {
        const providers = overlay(yield* core.get())
        const fallback = providers.qronos
        delete providers.qronos
        // qronos_change - the catalogue that models.dev still publishes under the old
        // product name lists 456 vendor-prefixed models the gateway does not serve.
        // It must never reach the picker.
        // qronos_change - models.dev publishes the upstream "qronos" gateway with 465
        // vendor-prefixed ids (anthropic/claude-haiku-5.5). api.qronos.me only accepts
        // bare ids (claude-haiku-5.5), so that entry must never reach the picker.
        delete providers.qronos
        // qronos_change - third-party catalogue cleanup, not branding. models.dev
        // still publishes the old product's gateway with 456 vendor-prefixed
        // models that api.qronos.me does not serve. Without these two lines the
        // picker lists that dead provider again.
        delete (providers as Record<string, unknown>).kilo
        delete (providers as Record<string, unknown>).kilocode

        const cfg = yield* config.get()
        const disabled = new Set(cfg.disabled_providers ?? [])
        const enabled = cfg.enabled_providers ? new Set(cfg.enabled_providers) : undefined
        const allowed = (!enabled || enabled.has("qronos")) && !disabled.has("qronos")
        const apt = cfg.provider?.apertis?.options
        const aptURL = apt?.baseURL ?? "https://api.apertis.ai/v1"
        const aptOpts = apt?.baseURL ? { baseURL: apt.baseURL } : {}

        const addApertis = Effect.fnUntraced(function* () {
          if (providers.apertis) return
          const models = yield* cache.fetch("apertis", aptOpts).pipe(Effect.catch(() => Effect.succeed({})))
          providers.apertis = {
            id: "apertis",
            name: "Apertis",
            env: ["APERTIS_API_KEY"],
            api: aptURL,
            npm: "@ai-sdk/openai-compatible",
            models,
          }
          if (Object.keys(models).length === 0)
            yield* cache.refresh("apertis", aptOpts).pipe(Effect.ignore, Effect.forkDetach)
        })

        if (!allowed) {
          yield* addApertis()
          return providers
        }

        const opts = cfg.provider?.qronos?.options
        const info = yield* auth.get("qronos").pipe(Effect.catch(() => Effect.succeed(undefined)))
        const org = organization(opts, info)
        const url = baseURL(opts?.baseURL, org)
        const fetch = {
          ...(url ? { baseURL: url } : {}),
          ...(org ? { qronosOrganizationId: org } : {}),
        }
        const valid = compatible({ ...fetch, qronosToken: token(opts, info) })
        const fetched = valid ? yield* cache.fetch("qronos", fetch).pipe(Effect.catch(() => Effect.succeed({}))) : {}
        const models = !valid || org || Object.keys(fetched).length > 0 ? fetched : (fallback?.models ?? {})
        providers.qronos = {
          id: "qronos",
          name: "Qronos AI Universal Gateway",
          env: ["QRONOS_API_KEY", "QRONOS_API_KEY"],
          api: QRONOS_OPENROUTER_BASE.endsWith("/") ? QRONOS_OPENROUTER_BASE : `${QRONOS_OPENROUTER_BASE}/`,
          npm: "@qronos-ai/gateway",
          models,
        }
        if (valid && !org && Object.keys(fetched).length === 0)
          yield* cache.refresh("qronos", fetch).pipe(Effect.ignore, Effect.forkDetach)
        yield* addApertis()
        return providers
      })

      return Service.of({ get, refresh: core.refresh, getFailure: cache.getFailure })
    }),
  )

export const defaultLayer: Layer.Layer<Service> = Layer.suspend(() => AppNodeBuilder.build(node)) // qronos_change - build from the LayerNode graph

export const node = LayerNode.make({
  service: Service,
  layer,
  deps: [Core.node, Config.node, Auth.node, ModelCache.node],
})

export { AI_SDK_PROVIDERS, PROMPTS }
export * as ModelsDev from "./models"
