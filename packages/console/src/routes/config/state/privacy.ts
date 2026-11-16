import type { Model, Provider } from "@qronos-ai/sdk/v2/client"

export function hasGateway(providers: Pick<Provider, "id">[]) {
  return providers.some((provider) => provider.id === "qronos")
}

export function visible(
  provider: Pick<Provider, "id">,
  model: Pick<Model, "mayTrainOnYourPrompts">,
  privacy: boolean,
) {
  return !privacy || provider.id !== "qronos" || model.mayTrainOnYourPrompts !== true
}
