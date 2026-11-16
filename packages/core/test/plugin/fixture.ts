import { AgentV2 } from "@qronos-ai/core/agent"
import { AISDK } from "@qronos-ai/core/aisdk"
import { Catalog } from "@qronos-ai/core/catalog"
import { CommandV2 } from "@qronos-ai/core/command"
import { Credential } from "@qronos-ai/core/credential"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder"
import { LayerNodePlatform } from "@qronos-ai/core/effect/app-node-platform"
import { LayerNode } from "@qronos-ai/core/effect/layer-node"
import { EventV2 } from "@qronos-ai/core/event"
import { FileSystem } from "@qronos-ai/core/filesystem"
import { FSUtil } from "@qronos-ai/core/fs-util"
import { Integration } from "@qronos-ai/core/integration"
import { Location } from "@qronos-ai/core/location"
import { Npm } from "@qronos-ai/core/npm"
import { PluginV2 } from "@qronos-ai/core/plugin"
import { Reference } from "@qronos-ai/core/reference"
import { SkillV2 } from "@qronos-ai/core/skill"
import { Global } from "@qronos-ai/core/global"
import { Effect, Layer } from "effect"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { tempLocationLayer } from "../fixture/location"

// kilocode_change - Credential imports Global.data/auth.json on startup, so without this the suite
// reads the developer's real credential store and its results depend on whether they are logged in.
const globalLayer = Global.layerWith({ data: fs.mkdtempSync(path.join(os.tmpdir(), "kilo-plugin-test-")) })

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
    [Global.node, globalLayer], // kilocode_change
  ],
)
