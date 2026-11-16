import { InstanceStore } from "@/project/instance-store"
import { ModelCache } from "@/provider/model-cache"
import { QronosViewers } from "@/qronos/presence/service" // qronos_change
import { Effect } from "effect"

export const disposeAllInstancesAfterProviderAuthCallback = Effect.fn(
  "QronosServer.disposeAllInstancesAfterProviderAuthCallback",
)(function* () {
  const store = yield* InstanceStore.Service
  yield* store.disposeAll()
})

// qronos_change start - drop the old presence socket; callers invoke this for the "qronos" provider only
export const invalidatePresence = Effect.fn("QronosServer.invalidatePresence")(function* () {
  const viewers = yield* QronosViewers.Service
  yield* viewers.invalidateAuth()
})
// qronos_change end

export const invalidateAfterProviderAuthChange = Effect.fn("QronosServer.invalidateAfterProviderAuthChange")(function* (
  providerID: string,
) {
  const cache = yield* ModelCache.Service
  yield* cache.clear(providerID)
  yield* disposeAllInstancesAfterProviderAuthCallback()
})
