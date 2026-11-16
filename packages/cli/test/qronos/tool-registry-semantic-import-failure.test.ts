import { describe, expect, spyOn, test } from "bun:test"
import { Effect, Schema } from "effect"
import * as Log from "@qronos-ai/core/util/log"
import { QronosToolRegistry } from "../../src/qronos/tool/registry"
import { Agent } from "../../src/agent/agent"
import * as Truncate from "../../src/tool/truncate"
import type * as Tool from "../../src/tool/tool"
import { provideTestInstance, tmpdir } from "../fixture/fixture"

const logger = Log.create({ service: "qronos-tool-registry" })
const deps = { agent: {} as Agent.Interface, truncate: {} as Truncate.Interface }

describe("qronos tool registry semantic tool import failure", () => {
  test("omits semantic_search when the semantic search tool cannot load", async () => {
    const err = new Error("semantic tool import failed")
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    await using tmp = await tmpdir({ git: true })

    try {
      const result = await provideTestInstance({
        directory: tmp.path,
        fn: () =>
          Effect.runPromise(
            QronosToolRegistry.build(infos(), deps, {
              indexing: async () => ({
                QronosIndexing: {
                  ready: () => true,
                },
              }),
              semantic: async () => {
                throw err
              },
            }),
          ),
      })

      expect(result.semantic).toBeUndefined()
      expect(result.recall.id).toBe("recall")
      expect(warn.mock.calls[0]?.[0]).toBe("semantic search tool unavailable")
      expect(warn.mock.calls[0]?.[1]?.err).toBeDefined()
    } finally {
      warn.mockRestore()
    }
  })
})

function infos() {
  return {
    recall: info("recall"),
    managerModels: info("agent_manager_models"),
    memory: info("qronos_memory_recall"),
    save: info("qronos_memory_save"),
    manager: info("agent_manager"),
    process: info("background_process"),
    browser: info("browser_open"),
    chart: info("chart"),
    image: info("generate_image"),
    notify: info("notify_user"),
    send: info("send_file"),
    linkPr: info("link_pr"),
    notebookRead: info("notebook_read"),
    notebookEdit: info("notebook_edit"),
    notebookExecute: info("notebook_execute"),
  }
}

function info(id: string): Tool.Info {
  return {
    id,
    init: () =>
      Effect.succeed({
        description: id,
        parameters: Schema.String,
        execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
      }),
  }
}
