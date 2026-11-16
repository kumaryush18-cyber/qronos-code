import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { AISDK } from "@qronos-ai/core/aisdk" // qronos_change
import { Catalog } from "@qronos-ai/core/catalog"
import { ModelV2 } from "@qronos-ai/core/model" // qronos_change
import { PluginV2 } from "@qronos-ai/core/plugin"
import { PluginHost } from "@qronos-ai/core/plugin/host"
import { ProviderPlugins } from "@qronos-ai/core/plugin/provider"
import { QronosPlugin } from "@qronos-ai/core/plugin/provider/qronos"
import { ProviderV2 } from "@qronos-ai/core/provider"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

const addPlugin = Effect.fn(function* () {
  const plugin = yield* PluginV2.Service
  const host = yield* PluginHost.make(plugin)
  yield* QronosPlugin.effect(host)
})

// qronos_change start
function withEnv<A, E, R>(vars: Record<string, string | undefined>, effect: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]))
      for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      return previous
    }),
    effect,
    (previous) =>
      Effect.sync(() => {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) delete process.env[key]
          else process.env[key] = value
        }
      }),
  )
}
// qronos_change end

describe("QronosPlugin", () => {
  it.effect("is registered so legacy referer headers can be applied", () =>
    Effect.sync(() => expect(ProviderPlugins.map((item) => item.id)).toContain(PluginV2.ID.make("qronos"))),
  )

  it.effect("applies legacy referer headers only to qronos", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.qronos, (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.qronos.me/api/gateway",
          }
          provider.request = { headers: { Existing: "value" }, body: {} }
        })
        catalog.provider.update(ProviderV2.ID.openrouter, () => {})
      })
      yield* addPlugin()
      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).toEqual({
        Existing: "value",
        "HTTP-Referer": "https://qronos.me/",
        "X-Title": "Qronos Code", // qronos_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.openrouter))?.request.headers).toEqual({})
    }),
  )

  it.effect("uses the exact legacy Qronos header casing and set", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.qronos, (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.qronos.me/api/gateway",
          }
        })
      })
      yield* addPlugin()

      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).toEqual({
        "HTTP-Referer": "https://qronos.me/",
        "X-Title": "Qronos Code", // qronos_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).not.toHaveProperty(
        "http-referer",
      )
      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).not.toHaveProperty("x-title")
      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).not.toHaveProperty("X-Source")
    }),
  )

  it.effect("uses the legacy provider-id guard instead of endpoint package matching", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.qronos, (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.qronos.me/api/gateway",
          }
        })
        catalog.provider.update(ProviderV2.ID.make("custom-qronos"), (provider) => {
          provider.api = { type: "aisdk", package: "qronos" }
        })
      })
      yield* addPlugin()

      expect((yield* catalog.provider.get(ProviderV2.ID.qronos))?.request.headers).toEqual({
        "HTTP-Referer": "https://qronos.me/",
        "X-Title": "Qronos Code", // qronos_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.make("custom-qronos")))?.request.headers).toEqual({})
    }),
  )

  // qronos_change start
  it.effect("routes the Qronos catalog through the Qronos Gateway SDK", () =>
    withEnv({ QRONOS_API_KEY: undefined, QRONOS_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const aisdk = yield* AISDK.Service
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => {
          catalog.provider.update(ProviderV2.ID.qronos, (provider) => {
            provider.api = {
              type: "aisdk",
              package: "@ai-sdk/openai-compatible",
              url: "https://api.qronos.me/api/gateway",
            }
            provider.request = { headers: {}, body: { apiKey: "stored-token" } }
          })
        })
        yield* addPlugin()
        const updated = yield* catalog.provider.get(ProviderV2.ID.qronos)

        expect(updated?.api).toEqual({
          type: "aisdk",
          package: "@qronos-ai/gateway",
          url: "https://api.qronos.me/v1",
        })
        expect(updated?.request.body.qronosToken).toBe("stored-token")

        const result = yield* aisdk.runSDK({
          model: ModelV2.Info.make({
            ...ModelV2.Info.empty(ProviderV2.ID.qronos, ModelV2.ID.make("qronos-auto/free")),
            api: {
              id: ModelV2.ID.make("qronos-auto/free"),
              type: "aisdk",
              package: "@qronos-ai/gateway",
            },
          }),
          package: "@qronos-ai/gateway",
          options: updated?.request.body ?? {},
        })
        expect(result.sdk).toBeDefined()
        expect(typeof result.sdk.languageModel).toBe("function")
        expect(typeof result.sdk.anthropic).toBe("function")
      }),
    ),
  )

  it.effect("keeps authenticated credentials ahead of inherited environment keys", () =>
    withEnv({ QRONOS_API_KEY: "environment-token", QRONOS_ORG_ID: "environment-org" }, () =>
      Effect.gen(function* () {
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => {
          catalog.provider.update(ProviderV2.ID.qronos, (provider) => {
            provider.request = {
              headers: {},
              body: { apiKey: "authenticated-token", qronosOrganizationId: "authenticated-org" },
            }
          })
        })
        yield* addPlugin()
        const result = yield* catalog.provider.get(ProviderV2.ID.qronos)

        expect(result?.request.body.apiKey).toBe("authenticated-token")
        expect(result?.request.body.qronosToken).toBe("authenticated-token")
        expect(result?.request.body.qronosOrganizationId).toBe("environment-org")
      }),
    ),
  )

  it.effect("keeps anonymous Qronos models available without credentials", () =>
    withEnv({ QRONOS_API_KEY: undefined, QRONOS_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => catalog.provider.update(ProviderV2.ID.qronos, () => {}))
        yield* addPlugin()
        const result = yield* catalog.provider.get(ProviderV2.ID.qronos)

        expect((yield* catalog.provider.available()).map((provider) => provider.id)).toContain(ProviderV2.ID.qronos)
        expect(result?.request.body.apiKey).toBe("anonymous")
        expect(result?.request.body.qronosToken).toBe("anonymous")
      }),
    ),
  )
  // qronos_change end
})
