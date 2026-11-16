import path from "path"
import { Effect, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { FSUtil } from "@qronos-ai/core/fs-util"
import { Ripgrep } from "@qronos-ai/core/ripgrep"
import * as QronosGrep from "@/qronos/tool/grep-signal-controls" // qronos_change
import { assertExternalDirectoryEffect } from "./external-directory"
import DESCRIPTION from "./grep.txt"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  pattern: Schema.String.annotate({ description: "Pattern to search for in file contents (regex by default)" }), // qronos_change
  path: Schema.optional(Schema.String).annotate({
    description: "The directory to search in. Defaults to the current working directory.",
  }),
  include: Schema.optional(Schema.String).annotate({
    description: 'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
  }),
  ...QronosGrep.fields, // qronos_change
})

export const GrepTool = Tool.define(
  "grep",
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const ripgrep = yield* Ripgrep.Service
    return {
      description: QronosGrep.describe(DESCRIPTION), // qronos_change
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const limit = params.limit ?? QronosGrep.DEFAULT_LIMIT // qronos_change
          const context = params.context ?? 0 // qronos_change
          const empty = {
            title: params.pattern,
            metadata: { matches: 0, truncated: false },
            output: "No files found",
          }
          if (!params.pattern) {
            throw new Error("pattern is required")
          }

          yield* ctx.ask({
            permission: "grep",
            patterns: [params.pattern],
            always: ["*"],
            metadata: {
              pattern: params.pattern,
              path: params.path,
              include: params.include,
              ...QronosGrep.metadata(params, limit, context), // qronos_change
            },
          })

          const ins = yield* InstanceState.context
          const requested = path.isAbsolute(params.path ?? ins.directory)
            ? (params.path ?? ins.directory)
            : path.join(ins.directory, params.path ?? ".")
          const requestedInfo = yield* fs.stat(requested).pipe(Effect.catch(() => Effect.succeed(undefined)))
          yield* assertExternalDirectoryEffect(ctx, requested, {
            bypass: false,
            kind: requestedInfo?.type === "Directory" ? "directory" : "file",
          })

          const search = FSUtil.resolve(requested)
          const info = yield* fs.stat(search).pipe(Effect.catch(() => Effect.succeed(undefined)))
          if (!info || (info.type !== "File" && info.type !== "Directory")) return empty // qronos_change
          const cwd = info?.type === "Directory" ? search : path.dirname(search)
          const result = yield* ripgrep.grep({
            cwd,
            file: info?.type === "File" ? path.basename(search) : undefined, // qronos_change - constrain exact-file searches
            pattern: params.pattern,
            include: params.include,
            ...QronosGrep.options(params, limit, context), // qronos_change
            signal: ctx.abort, // qronos_change - stop ripgrep when the tool call is cancelled
          })
          // qronos_change start
          const matches = result.items
          if (matches.length === 0) return empty
          // qronos_change end

          const rows = matches.map((item) => ({
            // qronos_change
            path: path.resolve(
              requestedInfo?.type === "Directory" ? requested : path.dirname(requested),
              item.entry.path,
            ),
            line: item.line,
            text: item.text,
            context: item.context, // qronos_change
            textTruncated: item.textTruncated, // qronos_change
          }))

          const truncated = result.truncated // qronos_change
          const final = rows
          if (final.length === 0) return empty

          const total = rows.filter((row) => !row.context).length // qronos_change
          const hasMore = truncated // qronos_change
          const output = [`Found ${total} matches${hasMore ? " (more matches available)" : ""}`]

          let current = ""
          for (const match of final) {
            if (current !== match.path) {
              if (current !== "") output.push("")
              current = match.path
              output.push(`${match.path}:`)
            }
            output.push(QronosGrep.line(match, context)) // qronos_change
          }

          if (truncated) {
            output.push("")
            output.push(QronosGrep.limitNotice(limit)) // qronos_change
          }
          output.push(...QronosGrep.notices(rows)) // qronos_change
          if (result.partial) output.push("", "(Some paths were inaccessible.)") // qronos_change

          return {
            title: params.pattern,
            metadata: {
              matches: total,
              truncated,
            },
            output: output.join("\n"),
          }
        }).pipe(Effect.orDie),
    }
  }),
)
