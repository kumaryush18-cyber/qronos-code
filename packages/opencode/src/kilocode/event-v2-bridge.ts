import type { EventV2 } from "@qronos-ai/core/event"
import { Location } from "@qronos-ai/core/location"
import { Project } from "@qronos-ai/core/project"
import { AbsolutePath } from "@qronos-ai/core/schema"
import { Effect } from "effect"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"

export const batch =
  (events: EventV2.Interface): EventV2.Interface["publishAll"] =>
  (entries, options) =>
    Effect.gen(function* () {
      if (options?.location) return yield* events.publishAll(entries, options)
      const ctx = yield* InstanceRef
      if (!ctx) return yield* events.publishAll(entries, options)
      const workspace = yield* WorkspaceRef
      return yield* events.publishAll(entries, {
        ...options,
        location: new Location.Info({
          directory: AbsolutePath.make(ctx.directory),
          ...(workspace ? { workspaceID: workspace } : {}),
          project: { id: Project.ID.make(ctx.project.id), directory: AbsolutePath.make(ctx.worktree) },
        }),
      })
    })
