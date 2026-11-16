export * as ConfigCommand from "./command"

import path from "path"
import * as Log from "@qronos-ai/core/util/log"
import { Cause, Exit, Schema } from "effect"
import { SchemaIssue } from "effect" // qronos_change - preserve Effect issue details in Qronos warnings
import { Glob } from "@qronos-ai/core/util/glob"
import { ConfigCommandV1 } from "@qronos-ai/core/v1/config/command"
import { configEntryNameFromPath } from "./entry-name"
import * as ConfigMarkdown from "./markdown"
// qronos_change start
import { FrontmatterError } from "@qronos-ai/core/v1/config/error"
import { QronosConfig } from "@/qronos/config/config"
import { report } from "@/qronos/config/report"
import type { Warning } from "./config"
import type { ConfigVariable } from "./variable"
// qronos_change end

const log = Log.create({ service: "config" })
const decodeInfo = Schema.decodeUnknownExit(ConfigCommandV1.Info)

// qronos_change start
export async function load(
  dir: string,
  warnings?: Warning[],
  trusted = false,
  fileScope?: ConfigVariable.FileScope,
  sourceScope?: ConfigVariable.FileScope | readonly ConfigVariable.FileScope[],
) {
  // qronos_change end
  const result: Record<string, ConfigCommandV1.Info> = {}
  for (const item of await Glob.scan("{command,commands}/**/*.md", {
    cwd: dir,
    absolute: true,
    dot: true,
    symlink: true,
  })) {
    // qronos_change start
    const md = await ConfigMarkdown.parse(item, { trusted, fileScope, sourceScope }).catch(async (err) => {
      // qronos_change end
      const message = FrontmatterError.isInstance(err)
        ? err.data.message
        : `Failed to parse command ${item}`
      // qronos_change start
      if (warnings) warnings.push({ path: item, message })
      try {
        const { capture } = await import("@/qronos/instance")
        const ctx = capture()
        if (ctx) await report(ctx, message)
      } catch (error) {
        log.warn("could not publish session error", { message, err: error })
      }
      // qronos_change end
      log.error("failed to load command", { command: item, err })
      return undefined
    })
    if (!md) continue

    const name = configEntryNameFromPath(path.relative(dir, item), ["command/", "commands/"])

    const config = {
      name,
      ...md.data,
      template: md.content.trim(),
    }
    const parsed = decodeInfo(config, { errors: "all", propertyOrder: "original" })
    if (Exit.isSuccess(parsed)) {
      result[config.name] = parsed.value
      continue
    }
    // qronos_change start
    const error = Cause.squash(parsed.cause)
    const issues = Schema.isSchemaError(error)
      ? SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues.map((issue) => ({
          ...issue,
          message: issue.message,
          path: issue.path?.map(String) ?? [],
        }))
      : [{ message: String(error), path: [] }]
    const cause = error instanceof Error ? error : new Error(String(error))
    await QronosConfig.handleInvalid("command", item, issues, cause, warnings)
    // qronos_change end
  }
  return result
}
