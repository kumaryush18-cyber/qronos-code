import type { QronosClient } from "@qronos-ai/sdk/v2"
import * as vscode from "vscode"

type PluginSpec = string | [string, Record<string, unknown>]

type ConfigLike = {
  plugin?: readonly PluginSpec[] | null
}

export type Features = {
  indexing: boolean
  sandboxControls: boolean
  backgroundSubagents: boolean
  speechToText: boolean
}

export function configFeatures(
  config?: ConfigLike | null,
  backgroundSubagents = false,
  remote = !!vscode.env.remoteName,
): Features {
  return {
    // qronos_change - the indexer needs an embeddings endpoint. api.qronos.me
    // answers /v1/embedding-models with the dashboard HTML, so the feature can
    // never finish; hide the tab instead of letting it fail silently.
    indexing: false,
    sandboxControls: process.platform !== "win32",
    backgroundSubagents,
    // qronos_change - the microphone needs GET /models/transcriptions and
    // POST /audio/transcriptions on the gateway. api.qronos.me serves neither,
    // so the button opened a recorder that could never return text. Hidden until
    // the gateway has the route; re-enable by returning !remote again.
    speechToText: false,
  }
}

export async function serverFeatures(client: Pick<QronosClient, "experimental">, dir: string) {
  if (!client.experimental?.capabilities?.get) return false
  try {
    const { data } = await client.experimental.capabilities.get({ directory: dir }, { throwOnError: true })
    return data?.backgroundSubagents === true
  } catch (error) {
    console.warn("[Qronos New] Failed to fetch server capabilities:", error)
    return false
  }
}
