export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@qronos-ai/core/flag/flag"
import { Global } from "@qronos-ai/core/global"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { FSUtil } from "@qronos-ai/core/fs-util"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* FSUtil.Service
  return (yield* afs.up({
    targets: [`${name}.jsonc`, `${name}.json`],
    start: directory,
    stop: worktree,
  })).toReversed()
})

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* FSUtil.Service
  return unique([
    Global.Path.config,
    ...(!Flag.QRONOS_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [".qronos", ".qronos", ".qronos"], // qronos_change - .qronos first, old names still read
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [".qronos", ".qronos", ".qronos"], // qronos_change
      start: Global.Path.home,
      stop: Global.Path.home,
    })),
    ...(Flag.QRONOS_CONFIG_DIR ? [Flag.QRONOS_CONFIG_DIR] : []),
  ])
})

export function fileInDirectory(dir: string, name: string) {
  return [path.join(dir, `${name}.json`), path.join(dir, `${name}.jsonc`)]
}
