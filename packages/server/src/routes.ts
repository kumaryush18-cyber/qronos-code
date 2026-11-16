import { Database } from "@qronos-ai/core/database/database"
import { LayerNode } from "@qronos-ai/core/effect/layer-node"
import { httpClient } from "@qronos-ai/core/effect/app-node-platform"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder"
import { EventV2 } from "@qronos-ai/core/event"
import { Credential } from "@qronos-ai/core/credential"
import { PermissionSaved } from "@qronos-ai/core/permission/saved"
import { PtyTicket } from "@qronos-ai/core/pty/ticket"
import { Pty } from "@qronos-ai/core/pty" // qronos_change
import { SessionV2 } from "@qronos-ai/core/session"
import { SessionExecution } from "@qronos-ai/core/session/execution"
import { LocationServiceMap } from "@qronos-ai/core/location-service-map"
import { SessionExecutionLocal } from "@qronos-ai/core/session/execution/local"
import { ToolOutputStore } from "@qronos-ai/core/tool-output-store"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Layer, Option } from "effect"
import { Api } from "./api"
import { ServerAuth } from "./auth"
import { handlers } from "./handlers"
import { authorizationLayer } from "./middleware/authorization"
import * as ReferenceReconciler from "./qronos/reference-reconciler" // qronos_change
import { schemaErrorLayer } from "./middleware/schema-error"
import { PtyEnvironment } from "./pty-environment"
import { layer as locationLayer } from "./location"
import { sessionLocationLayer } from "./middleware/session-location"

const applicationServices = LayerNode.group([
  Database.node,
  EventV2.node,
  httpClient,
  ToolOutputStore.cleanupNode,
  SessionV2.node,
  PermissionSaved.node,
  PtyTicket.node,
  Pty.shutdownNode, // qronos_change
  Credential.node,
  PtyEnvironment.node,
  LocationServiceMap.node,
])

export function createRoutes(password?: string) {
  return makeRoutes(
    password
      ? ServerAuth.Config.configLayer({ username: "opencode", password: Option.some(password) })
      : ServerAuth.Config.layer,
  )
}

export function createEmbeddedRoutes() {
  return makeRoutes(ServerAuth.Config.configLayer({ username: "opencode", password: Option.none() }))
}

function makeRoutes<AuthError, AuthServices>(auth: Layer.Layer<ServerAuth.Config, AuthError, AuthServices>) {
  const serviceLayer = AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])

  return HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(handlers),
    Layer.provide(sessionLocationLayer),
    Layer.provide(locationLayer), // qronos_change - standalone server has no Qronos config reconciler
    Layer.provide(authorizationLayer),
    Layer.provide(schemaErrorLayer),
    Layer.provide(auth),
    Layer.provide(serviceLayer),
    HttpRouter.provideRequest(ReferenceReconciler.noop), // qronos_change - request-scoped; no Qronos reconciler outside the CLI
  )
}

export const routes = createRoutes()

export const webHandler = () =>
  HttpRouter.toWebHandler(routes.pipe(Layer.provide(HttpServer.layerServices)), { disableLogger: true })
