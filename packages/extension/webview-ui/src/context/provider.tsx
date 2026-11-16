/**
 * Provider/model context
 * Manages available providers, models, and the global default selection.
 * Selection is now per-session — see session.tsx.
 */

import { batch, createContext, useContext, createSignal, createMemo, onCleanup } from "solid-js"
import type { ParentComponent, Accessor } from "solid-js"
import { useVSCode } from "./vscode"
import type { Provider, ProviderModel, ModelSelection, ExtensionMessage, ProviderAuthState } from "../types/messages"
import type { ProviderAuthMethod, ProviderFailure } from "@qronos-ai/sdk/v2/client"
import { flattenModels, findModel as _findModel, isModelValid as isValid } from "./provider-utils"
import { QRONOS_AUTO } from "../../../src/shared/provider-model"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

interface ProviderContextValue {
  providers: Accessor<Record<string, Provider>>
  connected: Accessor<string[]>
  defaults: Accessor<Record<string, string>>
  organizationId: Accessor<string | null | undefined>
  ready: Accessor<boolean>
  defaultSelection: Accessor<ModelSelection>
  models: Accessor<EnrichedModel[]>
  findModel: (selection: ModelSelection | null) => EnrichedModel | undefined
  authMethods: Accessor<Record<string, ProviderAuthMethod[]>>
  authStates: Accessor<Record<string, ProviderAuthState>>
  isModelValid: (selection: ModelSelection | null) => boolean
  /** The organization's Qronos catalog failed to load; the host retries until it recovers. */
  qronosUnavailable: Accessor<boolean>
  /** Typed reasons providers failed to load, so the UI can explain why instead of hiding them. */
  failures: Accessor<ProviderFailure[]>
}

export const ProviderContext = createContext<ProviderContextValue>()

export const ProviderProvider: ParentComponent = (props) => {
  const vscode = useVSCode()

  const [providers, setProviders] = createSignal<Record<string, Provider>>({})
  const [connected, setConnected] = createSignal<string[]>([])
  const [defaults, setDefaults] = createSignal<Record<string, string>>({})
  const [organizationId, setOrganizationId] = createSignal<string | null>()
  const [ready, setReady] = createSignal(false)
  const [defaultSelection, setDefaultSelection] = createSignal<ModelSelection>(QRONOS_AUTO)
  const [authMethods, setAuthMethods] = createSignal<Record<string, ProviderAuthMethod[]>>({})
  const [authStates, setAuthStates] = createSignal<Record<string, ProviderAuthState>>({})
  const [qronosUnavailable, setQronosUnavailable] = createSignal(false)
  const [failures, setFailures] = createSignal<ProviderFailure[]>([])

  // qronos_change - the picker lists Qronos Gateway models plus anything the
  // user connected themselves (a custom OpenAI-compatible provider, or a key
  // added in Providers). GitHub Copilot used to be injected by VS Code itself
  // and flooded the list, so it is the one id we hide. When Qronos has not
  // loaded yet we still show everything, otherwise the picker looks empty.
  const HIDDEN_PROVIDERS = new Set(["github-copilot"])
  const models = createMemo<EnrichedModel[]>(() => {
    const all = flattenModels(providers()).filter((model) => !HIDDEN_PROVIDERS.has(model.providerID))
    const connectedIDs = new Set(connected())
    const isQronos = (id: string) => id === "qronos" || id === "qronos"
    const usable = all.filter((model) => isQronos(model.providerID) || connectedIDs.has(model.providerID))
    const qronosOnly = all.filter((model) => isQronos(model.providerID))
    if (qronosOnly.length === 0) return all
    return usable.length > 0 ? usable : qronosOnly
  })

  function findModel(selection: ModelSelection | null): EnrichedModel | undefined {
    return _findModel(models(), selection)
  }

  function isModelValid(selection: ModelSelection | null): boolean {
    return isValid(providers(), connected(), selection)
  }

  // Register handler immediately (not in onMount) so we never miss
  // a providersLoaded message that arrives before the DOM mount.
  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type === "providersLoading") {
      batch(() => {
        setReady(false)
        setOrganizationId(undefined)
        setProviders((prev) => {
          const next = { ...prev }
          delete next.qronos
          return next
        })
        setDefaults((prev) => {
          const next = { ...prev }
          delete next.qronos
          return next
        })
        setConnected((prev) => prev.filter((id) => id !== "qronos"))
        setFailures((prev) => prev.filter((item) => item.providerID !== "qronos"))
      })
      return
    }
    if (message.type !== "providersLoaded") return

    batch(() => {
      setProviders(message.providers)
      setConnected(message.connected)
      setDefaults(message.defaults)
      setOrganizationId(message.ready === false ? undefined : (message.organizationId ?? null))
      setReady(message.ready ?? true)
      setDefaultSelection(message.defaultSelection)
      setAuthMethods(message.authMethods)
      setAuthStates(message.authStates)
      setQronosUnavailable(message.qronosUnavailable ?? false)
      setFailures(message.failures ?? [])
    })
  })

  onCleanup(unsubscribe)

  // Request providers immediately; if the extension's httpClient is not yet ready,
  // extensionDataReady will fire once initialization completes and we retry once.
  vscode.postMessage({ type: "requestProviders" })

  const fallback = setTimeout(() => {
    if (Object.keys(providers()).length === 0) {
      vscode.postMessage({ type: "requestProviders" })
    }
  }, 3000)

  const unsubReady = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "extensionDataReady") return
    unsubReady()
    clearTimeout(fallback)
    if (Object.keys(providers()).length === 0) {
      vscode.postMessage({ type: "requestProviders" })
    }
  })

  onCleanup(() => {
    unsubReady()
    clearTimeout(fallback)
  })

  const value: ProviderContextValue = {
    providers,
    connected,
    defaults,
    organizationId,
    ready,
    defaultSelection,
    models,
    findModel,
    authMethods,
    authStates,
    isModelValid,
    qronosUnavailable,
    failures,
  }

  return <ProviderContext.Provider value={value}>{props.children}</ProviderContext.Provider>
}

export function useProvider(): ProviderContextValue {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error("useProvider must be used within a ProviderProvider")
  }
  return context
}
