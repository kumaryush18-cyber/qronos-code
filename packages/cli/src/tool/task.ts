import * as Tool from "./tool"
import DESCRIPTION from "./task.txt"
import { ToolJsonSchema } from "./json-schema"
import { SessionV1 } from "@qronos-ai/core/v1/session"
import { BackgroundJob } from "@/background/job"
import { Session } from "@/session/session"
import { SessionID, MessageID } from "../session/schema"
import { MessageV2 } from "../session/message-v2"
import { Agent } from "../agent/agent"
import { deriveSubagentSessionPermission } from "../agent/subagent-permissions"
import type { SessionPrompt } from "../session/prompt"
import { Config } from "@/config/config"
import { Provider } from "@/provider/provider" // qronos_change
import { SessionDrain } from "@/qronos/session/drain" // qronos_change
import { EventV2Bridge } from "@/event-v2-bridge" // qronos_change
import { QronosTask } from "../qronos/tool/task" // qronos_change
import { QronosTaskBackgroundProcess } from "../qronos/tool/task-background-process" // qronos_change
import { QronosCostPropagation } from "../qronos/session/cost-propagation" // qronos_change
import { QronosSessionProcessor } from "../qronos/session/processor" // qronos_change
import { QronosSession } from "../qronos/session" // qronos_change
import { resumeHint } from "../qronos/task-resume" // qronos_change
import { errorMessage } from "@/util/error" // qronos_change
import { Effect, Exit, Schema, Scope } from "effect"
import { Cause } from "effect" // qronos_change
import { EffectBridge } from "@/effect/bridge"
import { RuntimeFlags } from "@/effect/runtime-flags"
import * as SandboxPolicy from "@/qronos/sandbox/policy" // qronos_change
import { Database } from "@qronos-ai/core/database/database"

export interface TaskPromptOps {
  cancel(sessionID: SessionID): Effect.Effect<void>
  resolvePromptParts(template: string): Effect.Effect<SessionPrompt.PromptInput["parts"]>
  prompt(input: SessionPrompt.PromptInput): Effect.Effect<SessionV1.WithParts>
}

const id = "task"
const BACKGROUND_DESCRIPTION = [
  "Background mode: background=true launches the subagent asynchronously and returns immediately.",
  "Use foreground when you need the result before proceeding; otherwise use background for non-overlapping work, but do not give the final answer until all required background results have arrived.", // qronos_change
  "You will be notified automatically when it finishes.",
].join(" ")
const BACKGROUND_STARTED = [
  "The task is working in the background. You will be notified automatically when it finishes.",
  "DO NOT sleep, poll for progress, ask the task for status, or duplicate this task's work — avoid working with the same files or topics it is using.",
  "Work on non-overlapping tasks, or briefly tell the user what you launched and end your response.",
].join("\n")
const BACKGROUND_UPDATED = [
  "Additional context sent to the running background task.",
  "The task is still working in the background. You will be notified automatically when it finishes.",
  "DO NOT sleep, poll for progress, ask the task for status, or duplicate this task's work — avoid working with the same files or topics it is using.",
  "Work on non-overlapping tasks, or briefly tell the user what you sent and end your response.",
].join("\n")

const BaseParameterFields = {
  description: Schema.String.annotate({ description: "A short (3-5 words) description of the task" }),
  prompt: Schema.String.annotate({ description: "The task for the agent to perform" }),
  subagent_type: Schema.String.annotate({ description: "The type of specialized agent to use for this task" }),
  task_id: Schema.optional(Schema.String).annotate({
    description:
      "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)",
  }),
  command: Schema.optional(Schema.String).annotate({ description: "The command that triggered this task" }),
}

const BaseParameters = Schema.Struct(BaseParameterFields)

export const Parameters = Schema.Struct({
  ...BaseParameterFields,
  ...QronosTask.ModelFields, // qronos_change
  background: Schema.optional(Schema.Boolean).annotate({
    description:
      "Run the agent in the background. You will be notified when it completes. DO NOT sleep, poll, or proactively check on its progress",
  }),
})

function renderOutput(input: {
  sessionID: SessionID
  state: "running" | "completed" | "error"
  summary?: string
  text: string
}) {
  const tag = input.state === "error" ? "task_error" : "task_result"
  // qronos_change start - surface the resumable task_id when a background subagent fails (#11620)
  const hint = resumeHint(input.sessionID)
  const body = input.state === "error" && !input.text.includes(hint) ? `${input.text}\n${hint}` : input.text
  // qronos_change end
  return [
    `<task id="${input.sessionID}" state="${input.state}">`,
    ...(input.summary ? [`<summary>${input.summary}</summary>`] : []),
    `<${tag}>`,
    body, // qronos_change - was input.text
    `</${tag}>`,
    "</task>",
  ].join("\n")
}

export const TaskTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agent = yield* Agent.Service
    const background = yield* BackgroundJob.Service
    const config = yield* Config.Service
    const sessions = yield* Session.Service
    const provider = yield* Provider.Service // qronos_change
    const drain = yield* SessionDrain.Service // qronos_change
    const events = yield* EventV2Bridge.Service // qronos_change
    const scope = yield* Scope.Scope
    const flags = yield* RuntimeFlags.Service
    const database = yield* Database.Service

    const run = Effect.fn("TaskTool.execute")(function* (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ) {
      const cfg = yield* config.get()
      const runInBackground = params.background === true
      if (runInBackground && !flags.experimentalBackgroundSubagents) {
        return yield* Effect.fail(new Error("Background subagents require QRONOS_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"))
      }

      const parent = yield* sessions.get(ctx.sessionID)
      let current = parent
      let depth = 0
      while (current.parentID) {
        // qronos_change start - tolerate pruned or corrupt ancestor rows
        const next = yield* sessions
          .get(current.parentID)
          .pipe(Effect.catchTag("NotFoundError", () => Effect.succeed(undefined)))
        if (!next) break
        // qronos_change end
        depth++
        current = next // qronos_change
      }
      if (depth >= (cfg.subagent_depth ?? 1)) {
        return yield* Effect.fail(
          new Error(
            `Subagent depth limit reached (${cfg.subagent_depth ?? 1}). Increase "subagent_depth" to allow nested subagents.`,
          ),
        )
      }

      if (!ctx.extra?.bypassAgentCheck) {
        yield* ctx.ask({
          permission: id,
          patterns: [params.subagent_type],
          always: ["*"],
          metadata: {
            description: params.description,
            subagent_type: params.subagent_type,
          },
        })
      }

      const next = yield* agent.get(params.subagent_type)
      if (!next) {
        return yield* Effect.fail(new Error(`Unknown agent type: ${params.subagent_type} is not a valid agent type`))
      }
      // qronos_change start — reject primary agents; only subagent/all modes allowed
      QronosTask.validate(next, params.subagent_type)
      // qronos_change end

      const canTask = depth + 1 < (cfg.subagent_depth ?? 1) // qronos_change - honor upstream's opt-in depth limit
      const canTodo = next.permission.some((rule) => rule.permission === "todowrite")

      const session = params.task_id
        ? yield* sessions.get(SessionID.make(params.task_id)).pipe(Effect.catchCause(() => Effect.succeed(undefined)))
        : undefined
      if (session && session.parentID !== ctx.sessionID) {
        return yield* Effect.fail(
          new Error(`Cannot resume session ${params.task_id}: not a child of the current session`),
        ) // qronos_change - prevent cross-session task resume
      }
      // qronos_change start
      const msg = yield* MessageV2.get({ sessionID: ctx.sessionID, messageID: ctx.messageID }).pipe(
        Effect.provideService(Database.Service, database),
        Effect.orDie,
      )
      if (msg.info.role !== "assistant") return yield* Effect.fail(new Error("Not an assistant message"))
      const source = { modelID: msg.info.modelID, providerID: msg.info.providerID }
      const selected = yield* QronosTask.resolveModel({
        name: next.name,
        agent: next,
        config: cfg,
        parent: source,
        variant: msg.info.variant,
        workflow: QronosTask.workflow(ctx.extra),
        provider,
        selection: { model: params.model, provider: params.provider, variant: params.variant },
        resume: session?.model,
      })
      const model = selected.model
      const variant = selected.variant
      const reasoning = msg.info.variant
      // qronos_change end
      // qronos_change start — inherit edit/bash/MCP restrictions from calling agent
      const caller = yield* agent.get(ctx.agent)
      const rules = QronosTask.inherited({ caller, session: parent, mcp: cfg.mcp })
      const childPermission = QronosTask.merge(
        deriveSubagentSessionPermission({
          parentSessionPermission: parent.permission ?? [],
          subagent: next,
        }),
        cfg.experimental?.primary_tools?.map((permission) => ({
          permission,
          pattern: "*",
          action: "deny" as const,
        })) ?? [],
        QronosTask.permissions(rules, canTask),
      )
      // qronos_change end
      // qronos_change start - refresh current parent restrictions when resuming an existing task session
      const fallback = SandboxPolicy.fallback(cfg)
      if (session) {
        yield* SandboxPolicy.inherit(ctx.sessionID, session.id, fallback)
        const permission = QronosTask.refresh(session.permission ?? [], childPermission)
        session.permission = permission
        yield* sessions.setPermission({ sessionID: session.id, permission })
      }
      // qronos_change end
      const platform = QronosSession.resolvePlatform(ctx.sessionID) // qronos_change - preserve parent attribution across task creation/resume
      // qronos_change start - create a child session with inherited Qronos restrictions
      const nextSession =
        session ??
        (yield* sessions.create({
          parentID: ctx.sessionID,
          title: params.description + ` (@${next.name} subagent)`,
          agent: next.name,
          platform, // qronos_change
          permission: childPermission, // qronos_change - persist inherited Qronos ceilings and upstream child denies
        }))
      // qronos_change end
      // qronos_change start - rebuild in-memory ancestry and inherit confinement after creation/resume
      QronosSession.register({ id: nextSession.id, parentID: ctx.sessionID, platform })
      yield* drain.link(nextSession.id, ctx.sessionID)
      yield* SandboxPolicy.inherit(ctx.sessionID, nextSession.id, fallback).pipe(
        Effect.provideService(Config.Service, config),
      )
      // qronos_change end

      const metadata = {
        parentSessionId: ctx.sessionID,
        sessionId: nextSession.id,
        model,
        ...(variant === undefined ? {} : { variant }), // qronos_change
        ...(runInBackground ? { background: true } : {}),
      }

      yield* ctx.metadata({
        title: params.description,
        metadata,
      })

      const ops = ctx.extra?.promptOps as TaskPromptOps
      if (!ops) return yield* Effect.fail(new Error("TaskTool requires promptOps in ctx.extra"))

      const runTask = Effect.fn("TaskTool.runTask")(
        function* () {
          const parts = yield* ops.resolvePromptParts(params.prompt)
          QronosSessionProcessor.markReviewTelemetry(parts, params.command) // qronos_change - carry review command into child session telemetry
          // qronos_change start
          const initial = yield* ops.prompt({
            messageID: MessageID.ascending(),
            sessionID: nextSession.id,
            model: {
              modelID: model.modelID,
              providerID: model.providerID,
            },
            variant, // qronos_change
            agent: next.name,
            tools: {
              question: false, // qronos_change - subagents cannot prompt the user directly
              ...(canTodo ? {} : { todowrite: false }),
              ...(canTask ? {} : { task: false }),
              ...Object.fromEntries((cfg.experimental?.primary_tools ?? []).map((item) => [item, false])),
            },
            parts,
          })
          yield* drain.wait(nextSession.id)
          const latest = (yield* sessions.messages({ sessionID: nextSession.id, limit: 1 })).at(-1)
          const result = latest?.info.role === "assistant" && latest.info.id > initial.info.id ? latest : initial
          // qronos_change end
          // qronos_change start - expose terminal child assistant errors through the task tool boundary,
          // including the resumable task_id so the parent agent can continue the subagent (#11620)
          if (result.info.role === "assistant" && result.info.error) {
            return yield* Effect.fail(new Error(`${errorMessage(result.info.error)}\n${resumeHint(nextSession.id)}`))
          }
          const failed = result.parts.findLast((item) => item.type === "tool" && item.state.status === "error")
          if (failed?.type === "tool" && failed.state.status === "error") {
            return yield* Effect.fail(new Error(`${failed.state.error}\n${resumeHint(nextSession.id)}`))
          }
          // qronos_change end
          // qronos_change start - ignore synthetic/ignored/empty text parts (e.g. the memory marker) when picking the task result (#13469)
          return (
            result.parts
              .filter((item): item is MessageV2.TextPart => item.type === "text")
              .findLast((item) => !item.synthetic && !item.ignored && item.text.length > 0)?.text ?? ""
          )
          // qronos_change end
        },
        Effect.ensuring(QronosTaskBackgroundProcess.finish(nextSession.id)),
      ) // qronos_change - transfer inherited processes when the child run ends

      // qronos_change start - inject completed background task results into the parent session
      const inject = Effect.fn("TaskTool.injectBackgroundResult")(function* (
        state: "completed" | "error",
        text: string,
      ) {
        const currentParent = yield* sessions.get(ctx.sessionID)
        yield* ops.prompt({
          sessionID: ctx.sessionID,
          agent: currentParent.agent ?? ctx.agent,
          model: currentParent.model
            ? { providerID: currentParent.model.providerID, modelID: currentParent.model.id }
            : source,
          variant: currentParent.model ? currentParent.model.variant : reasoning,
          parts: [
            {
              type: "text",
              synthetic: true,
              metadata: { background: true },
              text: renderOutput({
                sessionID: nextSession.id,
                state,
                summary:
                  state === "completed"
                    ? `Background task completed: ${params.description}`
                    : `Background task failed: ${params.description}`,
                text,
              }),
            },
          ],
        })
      })
      // qronos_change end

      // qronos_change start - background tasks propagate only cost accrued by this invocation
      let notified = false
      const notify = Effect.fn("TaskTool.notifyBackgroundResult")((jobID: string) =>
        Effect.uninterruptible(
          Effect.gen(function* () {
            if (notified) return
            notified = true
            const owner = yield* Scope.fork(scope, "parallel")
            const release = yield* drain.hold(ctx.sessionID)
            yield* Scope.addFinalizer(owner, Effect.sync(release))
            yield* background.wait({ id: jobID }).pipe(
              Effect.flatMap((result) => {
                if (result.info?.status === "completed") return inject("completed", result.info.output ?? "")
                if (result.info?.status === "error") return inject("error", result.info.error ?? "")
                if (result.info?.status === "cancelled") return Effect.void
                return Effect.die(new Error("Background task result is unavailable"))
              }),
              Effect.interruptible,
              Effect.catchCause((cause) =>
                Cause.hasInterruptsOnly(cause)
                  ? Effect.void
                  : events.publish(Session.Event.Error, {
                      sessionID: ctx.sessionID,
                      error: new MessageV2.APIError({
                        message: "Failed to deliver background task result",
                        isRetryable: false,
                      }).toObject(),
                    }),
              ),
              Effect.ensuring(Scope.close(owner, Exit.void)),
              Effect.forkIn(scope, { startImmediately: true }),
            )
          }),
        ),
      )

      const withCostPropagation = <A, E, R>(task: Effect.Effect<A, E, R>) =>
        Effect.acquireUseRelease(
          QronosCostPropagation.childCost(sessions, nextSession.id),
          () => task,
          (costBefore) =>
            Effect.gen(function* () {
              const costAfter = yield* QronosCostPropagation.childCost(sessions, nextSession.id)
              yield* QronosCostPropagation.propagate(sessions, ctx.sessionID, ctx.messageID, costAfter - costBefore).pipe(
                Effect.provideService(Database.Service, database),
              )
            }),
        )

      const backgroundRun = withCostPropagation(runTask().pipe(Effect.onInterrupt(() => ops.cancel(nextSession.id))))
      // qronos_change end

      if (
        yield* background.extend({
          id: nextSession.id,
          // qronos_change - extended background work also propagates its cost
          run: withCostPropagation(runTask().pipe(Effect.onInterrupt(() => ops.cancel(nextSession.id)))),
        })
      ) {
        return {
          title: params.description,
          metadata: {
            ...metadata,
            background: true,
            jobId: nextSession.id,
          },
          output: renderOutput({
            sessionID: nextSession.id,
            state: "running",
            summary: "Background task updated",
            text: BACKGROUND_UPDATED,
          }),
        }
      }

      const foregroundCost = runInBackground
        ? undefined
        : yield* QronosCostPropagation.childCost(sessions, nextSession.id) // qronos_change - snapshot before the foreground job starts
      // qronos_change start
      const start = QronosTask.start(background, (id) => ops.cancel(id), runInBackground ? notify : undefined)
      const info = yield* start({
        // qronos_change end
        id: nextSession.id,
        type: id,
        title: params.description,
        metadata,
        // qronos_change start
        onPromote: notify(nextSession.id).pipe(
          Effect.andThen(
            ctx.metadata({
              title: params.description,
              metadata: { ...metadata, background: true, jobId: nextSession.id },
            }),
          ),
        ),
        // qronos_change end
        // qronos_change - only the initial-background start needs its own cost bracket; the
        // foreground/promoted path below is already wrapped by the acquireUseRelease at the bottom of run()
        run: runInBackground ? backgroundRun : runTask().pipe(Effect.onInterrupt(() => ops.cancel(nextSession.id))),
      })

      function backgroundResult() {
        return {
          title: params.description,
          metadata: {
            ...metadata,
            background: true,
            jobId: info.id,
          },
          output: renderOutput({
            sessionID: nextSession.id,
            state: "running",
            summary: "Background task started",
            text: BACKGROUND_STARTED,
          }),
        }
      }

      if (runInBackground) return backgroundResult() // qronos_change

      const runCancel = yield* EffectBridge.make()
      const cancel = QronosTask.cancelForeground(background, nextSession.id, ops.cancel(nextSession.id)) // qronos_change

      function onAbort() {
        runCancel.fork(cancel)
      }

      return yield* Effect.acquireUseRelease(
        // qronos_change start - snapshot child cost so we propagate only the delta on resume (#6321)
        Effect.gen(function* () {
          ctx.abort.addEventListener("abort", onAbort)
          return foregroundCost ?? (yield* QronosCostPropagation.childCost(sessions, nextSession.id))
        }),
        // qronos_change end
        () =>
          Effect.gen(function* () {
            const result = yield* Effect.raceFirst(
              background.wait({ id: nextSession.id }).pipe(Effect.map((waited) => waited.info)),
              background.waitForPromotion(nextSession.id),
            )
            // qronos_change start
            if (result?.metadata?.background === true) {
              yield* notify(info.id)
              return backgroundResult()
            }
            // qronos_change end
            if (result?.status === "error") return yield* Effect.fail(new Error(result.error ?? "Task failed"))
            // qronos_change start - only an explicit stop/delete cancels a task its parent still awaits;
            // without that reason, models treat the result as a failure and start a new subagent right away
            if (result?.status === "cancelled") return yield* Effect.fail(new Error("Task cancelled by the user"))
            // qronos_change end
            return {
              title: params.description,
              metadata,
              output: renderOutput({ sessionID: nextSession.id, state: "completed", text: result?.output ?? "" }),
            }
          }),
        // qronos_change start - propagate subagent cost delta to parent on every exit path (#6321)
        (costBefore, exit) =>
          Effect.gen(function* () {
            if (Exit.hasInterrupts(exit))
              yield* QronosTask.cancelForeground(
                background,
                nextSession.id,
                Effect.all([cancel, background.cancel(nextSession.id)], { discard: true }),
              )
          }).pipe(
            Effect.ensuring(
              Effect.gen(function* () {
                ctx.abort.removeEventListener("abort", onAbort)
                const costAfter = yield* QronosCostPropagation.childCost(sessions, nextSession.id).pipe(
                  Effect.catchTag("NotFoundError", () => Effect.succeed(costBefore)),
                )
                yield* QronosCostPropagation.propagate(
                  sessions,
                  ctx.sessionID,
                  ctx.messageID,
                  costAfter - costBefore,
                ).pipe(
                  Effect.provideService(Database.Service, database),
                  Effect.catchTag("NotFoundError", () => Effect.void),
                )
              }),
            ),
          ),
        // qronos_change end
      )
    })

    // qronos_change start
    return {
      description: [
        DESCRIPTION,
        QronosTask.usageDescription,
        ...(flags.experimentalBackgroundSubagents ? [BACKGROUND_DESCRIPTION] : []),
        QronosTask.modelDescription,
      ].join("\n\n"),
      parameters: Parameters,
      jsonSchema: ToolJsonSchema.fromSchema(
        Schema.Struct({
          ...BaseParameters.fields,
          ...(flags.experimentalBackgroundSubagents ? { background: Parameters.fields.background } : {}),
          ...QronosTask.ModelFields,
        }),
      ),
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        drain.track(ctx.sessionID, run(params, ctx).pipe(Effect.scoped)).pipe(Effect.orDie),
    }
    // qronos_change end
  }),
)
