import { Config } from "@/config/config"
// qronos_change start - preserve Qronos API default model overlay
import { recommend } from "@/qronos/provider/catalog"
import { Auth } from "@/auth"
import { Option } from "effect"
import { ProviderV2 } from "@qronos-ai/core/provider"
import { ModelV2 } from "@qronos-ai/core/model"
import { filterPromptTrainingModels, nonEmptyProviders } from "@/qronos/provider/model-filter"
// qronos_change end
import { Provider } from "@/provider/provider"
import * as InstanceState from "@/effect/instance-state"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { markInstanceForDisposal } from "../lifecycle"

export const configHandlers = HttpApiBuilder.group(InstanceHttpApi, "config", (handlers) =>
  Effect.gen(function* () {
    const providerSvc = yield* Provider.Service
    const configSvc = yield* Config.Service
    const auth = yield* Auth.Service // qronos_change

    const get = Effect.fn("ConfigHttpApi.get")(function* () {
      return yield* configSvc.get()
    })

    const update = Effect.fn("ConfigHttpApi.update")(function* (ctx) {
      yield* configSvc.update(ctx.payload)
      yield* markInstanceForDisposal(yield* InstanceState.context)
      return ctx.payload
    })

    // qronos_change start
    const warnings = Effect.fn("ConfigHttpApi.warnings")(function* () {
      return yield* configSvc.warnings()
    })
    // qronos_change end

    const providers = Effect.fn("ConfigHttpApi.providers")(function* () {
      // qronos_change start
      const config = yield* configSvc.get()
      const providers = filterPromptTrainingModels(
        yield* providerSvc.list(),
        config.hide_prompt_training_models === true,
      )
      const defaults = Provider.defaultModelIDs(nonEmptyProviders(providers))
      // qronos_change end

      // qronos_change start - Fetch default model from Qronos API when the qronos provider is available.
      if (defaults[ProviderV2.ID.qronos]) {
        const info = yield* auth.get("qronos").pipe(Effect.option)
        const model = yield* Effect.promise(() =>
          recommend(
            providers[ProviderV2.ID.qronos].models,
            config.provider?.qronos?.options,
            Option.getOrUndefined(info),
            Option.isSome(info),
          ),
        )
        if (model && providers[ProviderV2.ID.qronos]?.models[model]) defaults[ProviderV2.ID.qronos] = ModelV2.ID.make(model)
      }
      // qronos_change end

      return {
        providers: Object.values(providers).map(Provider.toPublicInfo),
        default: defaults,
      }
    })

    return handlers
      .handle("get", get)
      .handle("update", update)
      .handle("warnings", warnings)
      .handle("providers", providers) // qronos_change
  }),
)
