export const opaque = [
  { id: "semantic_search", file: "qronos/tool/semantic-search.ts" },
  { id: "lsp", file: "tool/lsp.ts" },
] as const

export const host = [
  { id: "notebook_execute", file: "qronos/tool/notebook-host.ts" },
  { id: "background_process", file: "qronos/tool/background-process.ts" },
] as const
