export * as Ripgrep from "./ripgrep"

import { Context, Duration, Effect, Fiber, Layer, Schema, Stream } from "effect"
import { ChildProcess } from "effect/unstable/process"
import { makeGlobalNode } from "./effect/app-node"
import { Entry, Match } from "@qronos-ai/schema/filesystem"
import * as QronosGlob from "./qronos/ripgrep-glob" // qronos_change
import * as QronosGrep from "./qronos/ripgrep-grep" // qronos_change
import * as SpawnExit from "./qronos/spawn-exit" // qronos_change
import * as SpawnValidation from "./qronos/spawn-validation" // qronos_change
import { AppProcess, collectStream, waitForAbort } from "./process"
import { NonNegativeInt, PositiveInt, RelativePath } from "./schema"
import { RipgrepBinary } from "./ripgrep/binary"

/**
 * Small core-owned ripgrep execution adapter. It deliberately exposes raw
 * process-oriented rows, not model text or permission behavior. Search maps
 * these rows into filesystem results; leaf tools own
 * presentation and permission prompts.
 */

const ERROR_BYTES = 8 * 1024
const MAX_RECORD_BYTES = 64 * 1024
const MAX_SUBMATCHES = 100

const RawMatch = Schema.Struct({
  type: Schema.Literals(["match", "context"]), // qronos_change - retain requested context records
  data: Schema.Struct({
    path: QronosGrep.Data, // qronos_change - accept ripgrep's base64 shape for non-UTF-8 data
    lines: QronosGrep.Data, // qronos_change
    line_number: PositiveInt,
    absolute_offset: NonNegativeInt,
    submatches: Schema.Array(
      Schema.Struct({
        match: QronosGrep.Data, // qronos_change
        start: NonNegativeInt,
        end: NonNegativeInt,
      }),
    ),
  }),
})

type RawMatchData = (typeof RawMatch.Type)["data"] & { readonly context: boolean } // qronos_change

export class Error extends Schema.TaggedErrorClass<Error>()("Ripgrep.Error", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}

export class InvalidPatternError extends Schema.TaggedErrorClass<InvalidPatternError>()("Ripgrep.InvalidPatternError", {
  pattern: Schema.String,
  message: Schema.String,
}) {}

export interface FindInput {
  readonly cwd: string
  readonly pattern: string
  readonly limit: number
  readonly hidden?: boolean
  readonly follow?: boolean
  readonly signal?: AbortSignal
  readonly onEntry?: (entry: Entry) => Effect.Effect<void>
}

export interface GlobInput {
  readonly cwd: string
  readonly pattern: string
  readonly limit: number
  readonly hidden?: boolean
  readonly follow?: boolean
  readonly signal?: AbortSignal
  readonly validate?: Effect.Effect<void, unknown> // qronos_change - bind approved searches at spawn
  readonly noRequireGit?: boolean // qronos_change - honor ignore files outside a git repository
  readonly include?: readonly string[] // qronos_change - additional whitelist globs
  readonly exclude?: readonly string[] // qronos_change - additional exclusion globs
  readonly filter?: (path: string) => boolean // qronos_change - drop paths before the result limit
}

export interface GrepInput extends QronosGrep.Options {
  // qronos_change
  readonly cwd: string
  readonly pattern: string
  readonly file?: string
  readonly include?: string
  readonly limit: number
  readonly signal?: AbortSignal
  readonly validate?: Effect.Effect<void, unknown> // qronos_change - bind approved searches at spawn
}

export interface Interface {
  readonly find: (input: FindInput) => Effect.Effect<readonly Entry[], Error>
  readonly glob: (input: GlobInput) => Effect.Effect<SearchResult<Entry>, Error> // qronos_change
  readonly grep: (input: GrepInput) => Effect.Effect<SearchResult<QronosGrep.GrepMatch>, Error | InvalidPatternError> // qronos_change
}

// qronos_change start - retain truncation state through model-facing tools
export interface SearchResult<A> {
  readonly items: readonly A[]
  readonly truncated: boolean
  readonly partial: boolean
  readonly invalidPattern?: boolean // qronos_change - distinguish malformed globs from transient errors
}
// qronos_change end

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Ripgrep") {}

const failure = (message: string, cause?: unknown) => new Error({ message, cause })

// qronos_change start - also classify invalid globs for the marketplace scan
const isInvalidPattern = (stderr: string) =>
  stderr.includes("regex parse error") ||
  stderr.includes("error parsing regex") ||
  stderr.includes("error parsing glob")
// qronos_change end

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const process = yield* AppProcess.Service
    const binary = yield* RipgrepBinary.Service

    const run = <A>(input: {
      readonly cwd: string
      readonly args: string[]
      readonly limit: number
      readonly signal?: AbortSignal
      readonly timeout?: number // qronos_change
      readonly parse: (line: string) => Effect.Effect<A | undefined, Error>
      readonly pattern?: string
      readonly onItem?: (item: A) => Effect.Effect<void>
      readonly stop?: (item: A) => boolean // qronos_change - stop bounded searches at the overflow match
      readonly validate?: Effect.Effect<void, unknown> // qronos_change - spawn-bound target validation
    }) => {
      const program = Effect.scoped(
        Effect.gen(function* () {
          const filepath = yield* binary.filepath
          // qronos_change start - validate approved targets after all spawn preparation
          const command = ChildProcess.make(filepath, input.args, {
            cwd: input.cwd,
            extendEnv: true,
            stdin: "ignore",
            forceKillAfter: input.stop || input.timeout != null ? Duration.seconds(1) : undefined, // qronos_change - bound search interruption
          })
          const validated = input.validate ? SpawnValidation.attach(command, input.validate) : command
          const spawned = input.stop || input.timeout != null ? SpawnExit.attach(validated) : validated // qronos_change
          const handle = yield* process.spawn(spawned)
          const search = Effect.gen(function* () {
            // qronos_change end
            const stderrFiber = yield* collectStream(handle.stderr, ERROR_BYTES).pipe(
              Effect.map((output) => output.buffer.toString("utf8")),
              Effect.forkScoped,
            )
            let observed = 0
            let stopped = false // qronos_change
            const take = input.stop // qronos_change start
              ? Stream.takeUntil<A>((row) => {
                  stopped = input.stop?.(row) ?? false
                  return stopped
                })
              : Stream.take(input.limit + 1) // qronos_change end
            const rows = yield* Stream.decodeText(handle.stdout).pipe(
              Stream.splitLines,
              Stream.filter((line) => line.length > 0),
              Stream.mapEffect(input.parse),
              Stream.filter((row): row is A => row !== undefined),
              Stream.tap((row) => {
                if (!input.onItem || observed++ >= input.limit) return Effect.void
                return input.onItem(row)
              }),
              take, // qronos_change
              Stream.runCollect,
              Effect.map((chunk) => [...chunk]),
            )
            if (stopped) return { items: rows, truncated: true, partial: false } // qronos_change
            const truncated = input.stop ? false : rows.length > input.limit // qronos_change - custom stop owns truncation
            if (truncated) return { items: rows.slice(0, input.limit), truncated, partial: false }

            const code = yield* handle.exitCode
            const stderr = yield* Fiber.join(stderrFiber)
            if (input.pattern && code === 2 && isInvalidPattern(stderr)) {
              return yield* new InvalidPatternError({ pattern: input.pattern, message: stderr.trim() })
            }
            if (code !== 0 && code !== 1 && code !== 2) {
              return yield* failure(stderr.trim() || `ripgrep failed with code ${code}`)
            }
            return { items: code === 1 ? [] : rows, truncated: false, partial: code === 2 }
            // qronos_change start
          })
          return yield* input.timeout == null
            ? search
            : search.pipe(
                Effect.timeoutOrElse({
                  duration: input.timeout,
                  orElse: () =>
                    Effect.fail(failure("Glob search timed out after 2 minutes. Narrow the search path or pattern.")),
                }),
              )
          // qronos_change end
        }),
      )
      const abortable = input.signal ? program.pipe(Effect.raceFirst(waitForAbort(input.signal))) : program
      return abortable.pipe(
        // qronos_change start - surface the underlying reason instead of a bare wrapper message
        Effect.mapError((cause) => {
          if (cause instanceof Error || cause instanceof InvalidPatternError) return cause
          const detail = cause instanceof globalThis.Error && cause.message.trim() ? `: ${cause.message.trim()}` : ""
          return failure(`ripgrep execution failed${detail}`, cause)
        }),
        // qronos_change end
      )
    }

    return Service.of({
      glob: (input) =>
        run<string>({
          cwd: input.cwd,
          limit: input.limit,
          signal: input.signal,
          pattern: input.pattern, // qronos_change - surface malformed globs instead of a bare partial result
          timeout: 2 * 60 * 1000, // qronos_change
          validate: input.validate, // qronos_change - preserve spawn-bound target validation
          args: [
            "--no-config",
            "--files",
            ...(input.hidden ? ["--hidden"] : []),
            ...(input.follow ? ["--follow"] : []),
            ...(input.noRequireGit ? ["--no-require-git"] : []), // qronos_change
            ...QronosGlob.glob(input).args, // qronos_change - apply the pattern after ignore rules
            ...(input.include ?? []).map((glob) => `--glob=${glob}`), // qronos_change
            ...(input.exclude ?? []).map((glob) => `--glob=!${glob}`), // qronos_change
            "--glob=!**/.git/**",
            ".",
          ],
          // qronos_change start - drop paths the pattern or filter rejects
          parse: (line) => {
            const file = QronosGlob.relative(line)
            return Effect.succeed(QronosGlob.glob(input).keep(file) ? file : undefined)
          },
          // qronos_change end
        }).pipe(
          // qronos_change start - retain spawn metadata after mapping paths
          Effect.map((result) => ({
            ...result,
            items: result.items.map((relative) =>
              Entry.make({
                path: RelativePath.make(relative),
                type: "file",
              }),
            ),
          })),
          // qronos_change end
          // qronos_change start - a malformed glob narrows the result, not the whole request
          Effect.catchTag("Ripgrep.InvalidPatternError", () =>
            Effect.succeed({ items: [], truncated: false, partial: true, invalidPattern: true }),
          ),
          // qronos_change end
        ),
      find: (input) =>
        run<Entry>({
          cwd: input.cwd,
          limit: input.limit,
          signal: input.signal,
          args: [
            "--no-config",
            "--files",
            ...(input.hidden ? ["--hidden"] : []),
            ...(input.follow ? ["--follow"] : []),
            ...QronosGlob.find(input).args, // qronos_change - apply the pattern after ignore rules
            "--glob=!**/.git/**",
            ".",
          ],
          parse: (line) => {
            const relative = line
              .replace(/^(?:\.[\\/])+/u, "")
              .replace(/^[\\/]+/u, "")
              .replaceAll("\\", "/")
            if (!QronosGlob.find(input).keep(relative)) return Effect.succeed(undefined) // qronos_change
            return Effect.succeed(
              Entry.make({
                path: RelativePath.make(relative),
                type: "file",
              }),
            )
          },
          onItem: input.onEntry,
        }).pipe(
          Effect.map((result) => result.items),
          Effect.catchTag("Ripgrep.InvalidPatternError", (cause) => Effect.fail(failure(cause.message, cause))),
        ),
      grep: (input) =>
        run<RawMatchData>({
          ...input,
          stop: QronosGrep.stop(input.limit), // qronos_change
          args: [
            "--no-config",
            "--json",
            "--hidden",
            "--no-messages",
            ...QronosGrep.flags(input), // qronos_change
            ...QronosGlob.grep(input).args, // qronos_change - apply the include glob after ignore rules
            "--glob=!**/.git/**",
            "--",
            input.pattern,
            input.file ?? ".",
          ],
          parse: (line) =>
            (Buffer.byteLength(line, "utf8") > MAX_RECORD_BYTES
              ? Effect.fail(failure(`Ripgrep JSON record exceeded ${MAX_RECORD_BYTES} bytes`))
              : Effect.try({
                  try: () => JSON.parse(line) as unknown,
                  catch: (cause) => failure("Invalid ripgrep JSON output", cause),
                })
            ).pipe(
              Effect.flatMap((json) => {
                if (
                  !json ||
                  typeof json !== "object" ||
                  !("type" in json) ||
                  (json.type !== "match" && json.type !== "context") // qronos_change
                )
                  return Effect.succeed(undefined)
                return Schema.decodeUnknownEffect(RawMatch)(json).pipe(
                  Effect.map((match) => ({
                    ...match.data,
                    path: { text: match.data.path.text.replace(/^\.[\\/]/, "") },
                    submatches: match.data.submatches.slice(0, MAX_SUBMATCHES),
                    context: match.type === "context", // qronos_change
                  })),
                  Effect.map((row) => (QronosGlob.grep(input).keep(QronosGlob.relative(row.path.text)) ? row : undefined)), // qronos_change
                  Effect.mapError((cause) => failure("Invalid ripgrep match output", cause)),
                )
              }),
            ),
        }).pipe(
          // qronos_change start - retain spawn metadata after mapping matches
          Effect.map((result) => ({
            ...result,
            items: QronosGrep.select(input, result.items).map((match) => {
              const relative = match.path.text
                .replace(/^(?:\.[\\/])+/u, "")
                .replace(/^[\\/]+/u, "")
                .replaceAll("\\", "/")
              const item = Match.make({
                entry: Entry.make({
                  path: RelativePath.make(relative),
                  type: "file",
                }),
                line: match.line_number,
                offset: match.absolute_offset,
                text:
                  match.lines.text.length > 2_000
                    ? match.lines.text.slice(0, 2_000).replace(/[\uD800-\uDBFF]$/, "") + "..."
                    : match.lines.text,
                submatches: match.submatches.map((submatch) => ({
                  text: submatch.match.text,
                  start: submatch.start,
                  end: submatch.end,
                })),
              })
              return QronosGrep.decorate(item, match.context, match.lines.text.length > 2_000)
            }),
          })),
          // qronos_change end
        ),
    })
  }),
)

export const node = makeGlobalNode({ service: Service, layer: layer, deps: [RipgrepBinary.node, AppProcess.node] })
