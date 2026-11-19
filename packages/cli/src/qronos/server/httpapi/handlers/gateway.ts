import {
  GatewayError,
  fetchCloudSession,
  fetchQronosImageModels,
  fetchQronosTranscriptionModels,
  getCloudSessions,
  getOrganizationId,
  getToken,
} from "@qronos-ai/gateway"
import {
  HEADER_FEATURE,
  resolveQronosUrl,
  clearModesCache,
  fetchBalance,
  fetchQronosNotifications,
  fetchQronosPassState,
  fetchOrganizationModes,
  fetchProfile,
} from "@qronos-ai/gateway"
import { DIRECT_FIM_ENV, requestMistralFim, resolveFimTarget } from "@qronos-ai/gateway/fim"
import { buildQronosHeaders } from "@qronos-ai/gateway"
import { Effect, Schema } from "effect"
import * as Stream from "effect/Stream"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import * as Log from "@qronos-ai/core/util/log"
import { Flag } from "@qronos-ai/core/flag/flag"
import { Database } from "@qronos-ai/core/database/database"
import { QronosConfig } from "@/qronos/config/config"
import { ClaudeMigration } from "@/qronos/config/claude-migration"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { organization as catalogOrganization } from "@/qronos/provider/catalog"
import { EventV2Bridge } from "@/event-v2-bridge"
import { Storage } from "@/storage/storage"
import { Instance } from "@/qronos/instance"
import { InstanceStore } from "@/project/instance-store"
import { ModelCache } from "@/provider/model-cache"
import { InstanceHttpApi } from "@/server/routes/instance/httpapi/api"
import { AudioTranscriptionsBody, CloudSessionImportError, FimBody } from "../groups/gateway"

const FIM_TIMEOUT_MS = 30_000
const log = Log.create({ service: "gateway" })

function jsonError(error: string, status: number) {
  return HttpServerResponse.jsonUnsafe({ error }, { status })
}

function logError(route: string, err: unknown) {
  log.error("unhandled error", { route, err })
}

export const qronosGatewayHandlers = HttpApiBuilder.group(InstanceHttpApi, "qronos-gateway", (handlers) =>
  Effect.gen(function* () {
    const auth = yield* Auth.Service
    const config = yield* Config.Service
    const store = yield* InstanceStore.Service
    const cache = yield* ModelCache.Service
    const events = yield* EventV2Bridge.Service
    const database = yield* Database.Service
    const storage = yield* Storage.Service

    const profile = Effect.fn("QronosHttpApi.profile")(function* () {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      // qronos_change - a device-flow sign-in stores a plain API key (type "api"),
      // not an oauth bunde. Accept any usable token here, otherwise a signed-in
      // user was told "Not logged in" while the gateway worked fine.
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const currentOrgId = info?.type === "oauth" ? (info.accountId ?? null) : null
      const [profile, balance, qronosPass] = yield* Effect.tryPromise({
        try: () =>
          Promise.all([
            fetchProfile(token),
            fetchBalance(token, currentOrgId ?? undefined, log),
            fetchQronosPassState(token),
          ]),
        catch: () => new HttpApiError.BadRequest({}),
      })
      return { profile, balance, qronosPass, currentOrgId }
    })

    const authStatus = Effect.fn("QronosHttpApi.authStatus")(function* () {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      const cfg = yield* config.get()
      const organizationId = catalogOrganization(cfg.provider?.qronos?.options, info)
      const type = getToken(info) && (info?.type === "api" || info?.type === "oauth") ? info.type : undefined
      return {
        authenticated: !!type,
        ...(type ? { type } : {}),
        ...(organizationId == null ? {} : { organizationId }),
      }
    })

    const proxyAuth = Effect.fn("QronosHttpApi.proxyAuth")(function* () {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      return {
        auth: info,
        token: getToken(info),
        organizationId: getOrganizationId(info),
      }
    })

    const modes = Effect.fn("QronosHttpApi.modes")(function* () {
      const info = yield* auth.get("qronos").pipe(Effect.catch(() => Effect.succeed(undefined)))
      if (!info || info.type !== "oauth" || !info.access || !info.accountId) return { modes: [] }

      const org = info.accountId
      return yield* Effect.promise(() => fetchOrganizationModes(info.access, org)).pipe(
        Effect.map((modes) => ({ modes })),
        Effect.catch(() => Effect.succeed({ modes: [] })),
      )
    })

    const fim = Effect.fn("QronosHttpApi.fim")(function* (ctx: { payload: typeof FimBody.Type }) {
      const target = resolveFimTarget(ctx.payload.provider, ctx.payload.model)
      const info = target.provider === "qronos" ? yield* proxyAuth() : undefined
      const token = yield* Effect.gen(function* () {
        if (target.provider === "qronos") return info?.token
        const item = yield* auth.get(target.provider).pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
        if (item?.type === "api") return item.key
        return DIRECT_FIM_ENV[target.provider].map((key) => process.env[key]).find(Boolean)
      })

      if (target.provider === "qronos" && !info?.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const request = yield* HttpServerRequest.HttpServerRequest
      const signal =
        request.source instanceof Request
          ? AbortSignal.any([request.source.signal, AbortSignal.timeout(FIM_TIMEOUT_MS)])
          : AbortSignal.timeout(FIM_TIMEOUT_MS)
      const response = yield* Effect.promise(async () => {
        try {
          const run = async (url: string): Promise<Response> => {
            console.info(`[FIM] request provider=${target.provider} model=${target.model} url=${url}`)
            return fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(target.provider === "qronos"
                  ? buildQronosHeaders(undefined, { qronosOrganizationId: info?.organizationId })
                  : {}),
                ...(target.provider === "qronos" ? { [HEADER_FEATURE]: "autocomplete" } : {}),
              },
              signal,
              body: JSON.stringify({
                model: target.model,
                prompt: ctx.payload.prefix,
                suffix: ctx.payload.suffix,
                max_tokens: ctx.payload.maxTokens ?? 256,
                temperature: ctx.payload.temperature ?? 0.2,
                stream: true,
              }),
            })
          }
          if (target.provider === "mistral") return requestMistralFim(run)
          return run(target.url)
        } catch (err) {
          if (err instanceof DOMException && err.name === "TimeoutError")
            return Response.json({ error: "FIM request timed out" }, { status: 504 })
          if (signal.aborted) return Response.json({ error: "FIM request canceled" }, { status: 499 })
          throw err
        }
      })
      if (!response.ok) {
        const text = yield* Effect.promise(() => response.text())
        return HttpServerResponse.jsonUnsafe(
          { error: `FIM request failed: ${response.status} ${text}` },
          { status: response.status },
        )
      }
      if (!response.body) return HttpServerResponse.raw(null, { status: response.status })

      return HttpServerResponse.stream(
        Stream.fromReadableStream({
          evaluate: () => response.body!,
          onError: (err) => err,
        }),
        {
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      )
    })

    const audioTranscriptions = Effect.fn("QronosHttpApi.audioTranscriptions")(function* (ctx: {
      payload: typeof AudioTranscriptionsBody.Type
    }) {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const request = yield* HttpServerRequest.HttpServerRequest
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(resolveQronosUrl("audio/transcriptions"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${info.token}`,
              ...buildQronosHeaders(undefined, { qronosOrganizationId: info.organizationId }),
              [HEADER_FEATURE]: "vscode-extension",
            },
            signal: request.source instanceof Request ? request.source.signal : undefined,
            body: JSON.stringify(ctx.payload),
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })
      const text = yield* Effect.promise(() => response.text())
      return HttpServerResponse.raw(text, {
        status: response.status,
        contentType: response.headers.get("Content-Type") ?? "application/json",
      })
    })

    const notifications = Effect.fn("QronosHttpApi.notifications")(function* () {
      // Locally-detected notice about leftover opencode config; appended so it reuses each client's dismissal path.
      const notice = QronosConfig.qronosConfigNotification({
        directory: Instance.directory,
        worktree: Instance.worktree,
        scanProject: !Flag.QRONOS_DISABLE_PROJECT_CONFIG,
      })
      const claude = yield* Effect.promise(() => ClaudeMigration.notification())
      const append = <T>(list: T[]) => [...list, ...(notice ? [notice] : []), ...(claude ? [claude] : [])]

      const info = yield* auth.get("qronos").pipe(Effect.catch(() => Effect.succeed(undefined)))
      const token = getToken(info)
      if (!token) return append([])

      const cloud = yield* Effect.promise(() =>
        fetchQronosNotifications({
          qronosToken: token,
          qronosOrganizationId: getOrganizationId(info),
        }),
      )
      return append(cloud)
    })

    const organization = Effect.fn("QronosHttpApi.organization")(function* (ctx) {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      // qronos_change - API-key sign-ins have no organization to switch, so keep
      // the stored entry untouched instead of failing the whole call.
      if (!info) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (info.type !== "oauth") return true // qronos_change - nothing to switch for an API key

      yield* auth
        .set("qronos", {
          type: "oauth",
          refresh: info.refresh,
          access: info.access,
          expires: info.expires,
          ...(ctx.payload.organizationId && { accountId: ctx.payload.organizationId }),
        })
        .pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))

      yield* cache.clear("qronos")
      clearModesCache()
      yield* store.disposeAll().pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      return true
    })

    const cloudSessions = Effect.fn("QronosHttpApi.cloudSessions")(function* (ctx) {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const query = {
        ...ctx.query,
        limit: ctx.query.limit === undefined ? undefined : Number(ctx.query.limit),
      }

      return yield* Effect.tryPromise({
        try: () => getCloudSessions(token, query),
        catch: (err) => err,
      }).pipe(
        Effect.match({
          onFailure: (err) => {
            if (err instanceof GatewayError) return jsonError(err.message, err.status)
            logError("cloud-sessions", err)
            return jsonError("Internal error", 500)
          },
          onSuccess: (result) => result,
        }),
      )
    })

    const cloudSession = Effect.fn("QronosHttpApi.cloudSession")(function* (ctx) {
      const info = yield* auth.get("qronos").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () => fetchCloudSession(token, ctx.params.id),
        catch: (err) => err,
      }).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            logError("cloud/session/get", err)
            return undefined
          }),
        ),
      )
      if (!result) return jsonError("Internal error", 500)
      if (!result.ok) return jsonError(result.error, result.status)
      return result.data
    })

    const cloudSessionImport = Effect.fn("QronosHttpApi.cloudSessionImport")(function* (ctx) {
      // Load the helper lazily: a static top-level import pulls the HTTP
      // handler graph into the remote-sender module graph and breaks the
      // create_session test's module init. Run the helper's Effect on the
      // request Effect (yield*) so the request-scoped InstanceRef/WorkspaceRef
      // reach the persistence path instead of the AppRuntime default context.
      const { CloudSessionImportInProcess } = yield* Effect.promise(
        () => import("@/qronos/server/import-cloud-session-in-process"),
      )
      const outcome = yield* CloudSessionImportInProcess.importSession(ctx.payload.sessionId).pipe(
        Effect.provideService(Auth.Service, auth),
        Effect.provideService(EventV2Bridge.Service, events),
        Effect.provideService(Database.Service, database),
        Effect.provideService(Storage.Service, storage),
        Effect.match({
          onFailure: (err) => {
            if (err instanceof CloudSessionImportInProcess.Unauthorized) return { tag: "unauthorized" as const }
            if (err instanceof CloudSessionImportInProcess.Upstream) {
              return { tag: "upstream" as const, error: err.error, status: err.status }
            }
            if (err instanceof CloudSessionImportInProcess.BadRequest) return { tag: "badrequest" as const }
            return { tag: "internal" as const }
          },
          onSuccess: (session) => ({ tag: "ok" as const, session }),
        }),
      )
      switch (outcome.tag) {
        case "unauthorized":
          return yield* Effect.fail(new HttpApiError.Unauthorized({}))
        case "upstream":
          return jsonError(outcome.error, outcome.status)
        case "badrequest":
          return yield* Effect.fail(new HttpApiError.BadRequest({}))
        case "internal":
          return yield* Effect.fail(new CloudSessionImportError({ error: "Internal error" }))
        case "ok":
          return outcome.session
      }
    })

    const imageModels = Effect.fn("QronosHttpApi.imageModels")(function* () {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () =>
          fetchQronosImageModels({
            qronosToken: info.token,
            qronosOrganizationId: info.organizationId,
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })

      if (result.error) {
        const err =
          result.error.kind === "unauthorized" ? new HttpApiError.Unauthorized({}) : new HttpApiError.BadRequest({})
        return yield* Effect.fail(err)
      }

      return result.models
    })

    const transcriptionModels = Effect.fn("QronosHttpApi.transcriptionModels")(function* () {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () =>
          fetchQronosTranscriptionModels({
            qronosToken: info.token,
            qronosOrganizationId: info.organizationId,
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })

      if (result.error) {
        const err =
          result.error.kind === "unauthorized" ? new HttpApiError.Unauthorized({}) : new HttpApiError.BadRequest({})
        return yield* Effect.fail(err)
      }

      return result.models
    })

    return handlers
      .handle("profile", profile)
      .handle("authStatus", authStatus)
      .handle("modes", modes)
      .handle("fim", fim)
      .handle("audioTranscriptions", audioTranscriptions)
      .handle("imageModels", imageModels)
      .handle("transcriptionModels", transcriptionModels)
      .handle("notifications", notifications)
      .handle("organization", organization)
      .handle("cloudSessions", cloudSessions)
      .handle("cloudSession", cloudSession)
      .handle("cloudSessionImport", cloudSessionImport)
  }),
)
