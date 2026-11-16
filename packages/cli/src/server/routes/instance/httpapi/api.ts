import { Schema } from "effect"
import { HttpApi } from "effect/unstable/httpapi"
import { EventV2 } from "@qronos-ai/core/event"
import { EventManifest } from "@/event-manifest"
import { Credential } from "@qronos-ai/core/credential"
import { Integration } from "@qronos-ai/core/integration"
import { SkillV2 } from "@qronos-ai/core/skill"
import { InstanceDisposed } from "@/server/event"
import { Question } from "@/question"
import { BusEvent } from "@/bus/bus-event" // qronos_change - include legacy Qronos events until they migrate to EventV2
import { ConfigApi } from "./groups/config"
import { ControlApi } from "./groups/control"
import { ControlPlaneApi } from "./groups/control-plane"
import { EventApi } from "./groups/event"
import { ExperimentalApi } from "./groups/experimental"
import { FileApi } from "./groups/file"
import { InstanceApi } from "./groups/instance"
import { McpApi } from "./groups/mcp"
import { PermissionApi } from "./groups/permission"
import { ProjectApi } from "./groups/project"
import { ProjectCopyApi } from "./groups/project-copy"
import { ProviderApi } from "./groups/provider"
import { PtyApi, PtyConnectApi } from "./groups/pty"
import { QuestionApi } from "./groups/question"
import { SessionApi } from "./groups/session"
import { SyncApi } from "./groups/sync"
import { TuiApi } from "./groups/tui"
import { WorkspaceApi } from "./groups/workspace"
// qronos_change start - Qronos HttpApi groups
import { AgentBuilderApi } from "@/qronos/server/httpapi/groups/agent-builder"
import { AgentUsageApi } from "@/qronos/server/httpapi/groups/agent-usage"
import { BranchNameApi } from "@/qronos/server/httpapi/groups/branch-name"
import { CommitMessageApi } from "@/qronos/server/httpapi/groups/commit-message"
import { CloudAgentApi } from "@/qronos/server/httpapi/groups/cloud-agent"
import { BackgroundProcessApi } from "@/qronos/server/httpapi/groups/background-process"
import { ConfigConsoleApi } from "@/qronos/server/httpapi/groups/config-console"
import { EnhancePromptApi } from "@/qronos/server/httpapi/groups/enhance-prompt"
import { IndexingApi } from "@/qronos/server/httpapi/groups/indexing"
import { InstanceReloadApi } from "@/qronos/server/httpapi/groups/instance-reload"
import { QronosGatewayApi } from "@/qronos/server/httpapi/groups/gateway"
import { QronosApi } from "@/qronos/server/httpapi/groups/qronos"
import { MigrateApi } from "@/qronos/server/httpapi/groups/migrate"
import { NetworkApi } from "@/qronos/server/httpapi/groups/network"
import { RemoteApi } from "@/qronos/server/httpapi/groups/remote"
import { SandboxApi } from "@/qronos/server/httpapi/groups/sandbox"
import { SessionHostApi } from "@/qronos/server/httpapi/groups/session-host"
import { SessionImportApi } from "@/qronos/server/httpapi/groups/session-import"
import { SuggestionApi } from "@/qronos/server/httpapi/groups/suggestion"
import { TelemetryApi } from "@/qronos/server/httpapi/groups/telemetry"
import { MemoryApi } from "@/qronos/server/httpapi/groups/memory" // qronos_change
// qronos_change end
import { makeApi } from "@qronos-ai/protocol/api"
import { LocationMiddleware } from "@qronos-ai/server/location"
import { SessionLocationMiddleware } from "@qronos-ai/server/middleware/session-location"
import { GlobalApi } from "./groups/global"
import { Authorization } from "./middleware/authorization"
import { SchemaErrorMiddleware } from "./middleware/schema-error"

const EventSchema = Schema.Union([
  ...EventManifest.Latest.values()
    .map((definition) =>
      Schema.Struct({
        id: EventV2.ID,
        type: Schema.Literal(definition.type),
        properties: definition.data,
      }).annotate({ identifier: `Event.${definition.type}` }),
    )
    .toArray(),
  ...BusEvent.effectPayloads(), // qronos_change - include legacy Qronos events until they migrate to EventV2
  InstanceDisposed,
]).annotate({ identifier: "Event" })

export const ServerApi = makeApi({
  definitions: EventManifest.Latest.values().toArray(),
  locationMiddleware: LocationMiddleware,
  sessionLocationMiddleware: SessionLocationMiddleware,
})

export const RootHttpApi = HttpApi.make("opencode-root")
  .addHttpApi(ControlApi)
  .addHttpApi(ControlPlaneApi)
  .addHttpApi(GlobalApi)
  .middleware(SchemaErrorMiddleware)
  .middleware(Authorization)

export const InstanceHttpApi = HttpApi.make("opencode-instance")
  .addHttpApi(ConfigApi)
  .addHttpApi(ExperimentalApi)
  .addHttpApi(FileApi)
  .addHttpApi(InstanceApi)
  .addHttpApi(McpApi)
  .addHttpApi(ProjectApi)
  .addHttpApi(ProjectCopyApi)
  .addHttpApi(PtyApi)
  .addHttpApi(QuestionApi)
  .addHttpApi(PermissionApi)
  .addHttpApi(ProviderApi)
  .addHttpApi(SessionApi)
  .addHttpApi(SyncApi)
  .addHttpApi(TuiApi)
  .addHttpApi(WorkspaceApi)
  // qronos_change start - Qronos HttpApi groups
  .addHttpApi(AgentBuilderApi)
  .addHttpApi(AgentUsageApi)
  .addHttpApi(BackgroundProcessApi)
  .addHttpApi(BranchNameApi)
  .addHttpApi(CommitMessageApi)
  .addHttpApi(CloudAgentApi)
  .addHttpApi(ConfigConsoleApi)
  .addHttpApi(EnhancePromptApi)
  .addHttpApi(IndexingApi)
  .addHttpApi(InstanceReloadApi)
  .addHttpApi(QronosGatewayApi)
  .addHttpApi(QronosApi)
  .addHttpApi(MigrateApi)
  .addHttpApi(NetworkApi)
  .addHttpApi(RemoteApi)
  .addHttpApi(SandboxApi)
  .addHttpApi(SessionHostApi)
  .addHttpApi(SessionImportApi)
  .addHttpApi(SuggestionApi)
  .addHttpApi(TelemetryApi)
  .addHttpApi(MemoryApi)
  // qronos_change end
  .middleware(SchemaErrorMiddleware)

export const OpenCodeHttpApi = HttpApi.make("opencode")
  .addHttpApi(RootHttpApi)
  .addHttpApi(EventApi)
  .addHttpApi(InstanceHttpApi)
  .addHttpApi(ServerApi)
  .addHttpApi(PtyConnectApi)
  .annotate(HttpApi.AdditionalSchemas, [
    EventSchema,
    Question.Replied,
    Question.Rejected,
    Credential.Value,
    Integration.Inputs,
    Integration.Method,
    Integration.Ref,
    SkillV2.Source,
  ])

export type RootHttpApiType = typeof RootHttpApi
export type InstanceHttpApiType = typeof InstanceHttpApi
