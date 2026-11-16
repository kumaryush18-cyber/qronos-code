import type { WorkspaceV2 } from "@qronos-ai/core/workspace" // qronos_change
import { dispose } from "@/qronos/effect/instance-registry" // qronos_change

const disposers = new Set<(directory: string, workspaceID?: WorkspaceV2.ID) => Promise<void>>() // qronos_change

// qronos_change start
export function registerDisposer(
  disposer: (directory: string, workspaceID?: WorkspaceV2.ID) => Promise<void>, // qronos_change
) {
  disposers.add(disposer)
  return () => {
    disposers.delete(disposer)
  }
}

export async function disposeInstance(directory: string, workspaceID?: WorkspaceV2.ID) {
  await dispose(directory, workspaceID, () =>
    Promise.allSettled([...disposers].map((disposer) => disposer(directory, workspaceID))),
  )
}
// qronos_change end
