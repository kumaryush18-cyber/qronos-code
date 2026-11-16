import { AbsolutePath } from "@qronos-ai/core/schema"
import { Location } from "@qronos-ai/core/location"
import { Pty } from "@qronos-ai/core/pty"
import { Effect } from "effect"

export function clearPtys(directory: string, workspaceID: Location.Ref["workspaceID"]) {
  return Effect.promise(() =>
    Pty.terminateDirectory(
      Location.Ref.make({
        directory: AbsolutePath.make(directory),
        workspaceID,
      }),
    ),
  )
}
