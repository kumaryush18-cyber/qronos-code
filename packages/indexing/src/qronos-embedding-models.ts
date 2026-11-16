export type QronosEmbeddingModel = {
  id: string
  name: string
  dimension: number
  scoreThreshold: number
  note?: string
}

export type QronosEmbeddingModelCatalog = {
  defaultModel: string
  models: QronosEmbeddingModel[]
  aliases: Record<string, string>
}

export const EMPTY_QRONOS_EMBEDDING_MODEL_CATALOG: QronosEmbeddingModelCatalog = {
  defaultModel: "",
  models: [],
  aliases: {},
}

export function normalizeQronosEmbeddingModelId(model: string | undefined, catalog = EMPTY_QRONOS_EMBEDDING_MODEL_CATALOG) {
  if (!model) return undefined
  return catalog.aliases[model] ?? model
}

export function getQronosEmbeddingModel(model: string | undefined, catalog = EMPTY_QRONOS_EMBEDDING_MODEL_CATALOG) {
  const id = normalizeQronosEmbeddingModelId(model, catalog)
  return catalog.models.find((item) => item.id === id)
}

export function formatQronosEmbeddingModelLabel(model: QronosEmbeddingModel): string {
  const note = model.note ? `${model.note}, ` : ""
  return `${model.name} (${note}${model.dimension}d)`
}
