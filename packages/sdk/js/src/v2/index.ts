export * from "./client.js"
export * from "./server.js"

import { createQronosClient } from "./client.js"
import { createQronosServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createQronos(options?: ServerOptions) {
  const server = await createQronosServer({
    ...options,
  })

  const client = createQronosClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
