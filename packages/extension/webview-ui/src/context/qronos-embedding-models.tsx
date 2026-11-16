import { createContext, createSignal, onCleanup, useContext, type Accessor, type ParentComponent } from "solid-js"
import {
  EMPTY_QRONOS_EMBEDDING_MODEL_CATALOG,
  type QronosEmbeddingModelCatalog,
} from "@qronos-ai/indexing/embedding-models"
import { useVSCode } from "./vscode"
import type { ExtensionMessage } from "../types/messages"

type QronosEmbeddingModelsContextValue = {
  catalog: Accessor<QronosEmbeddingModelCatalog>
}

export const QronosEmbeddingModelsContext = createContext<QronosEmbeddingModelsContextValue>()

export const QronosEmbeddingModelsProvider: ParentComponent = (props) => {
  const vscode = useVSCode()
  const [catalog, setCatalog] = createSignal<QronosEmbeddingModelCatalog>(EMPTY_QRONOS_EMBEDDING_MODEL_CATALOG)

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "qronosEmbeddingModelsLoaded") return
    setCatalog(message.catalog)
  })

  vscode.postMessage({ type: "requestQronosEmbeddingModels" })

  onCleanup(unsubscribe)

  return <QronosEmbeddingModelsContext.Provider value={{ catalog }}>{props.children}</QronosEmbeddingModelsContext.Provider>
}

export function useQronosEmbeddingModels(): QronosEmbeddingModelsContextValue {
  const context = useContext(QronosEmbeddingModelsContext)
  if (!context) {
    throw new Error("useQronosEmbeddingModels must be used within a QronosEmbeddingModelsProvider")
  }
  return context
}
