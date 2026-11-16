import type { QronosClient } from "@qronos-ai/sdk/v2/client"

export async function hasGit(client: QronosClient, directory: string): Promise<boolean> {
  return Promise.resolve()
    .then(() => client.project.current({ directory }))
    .then((r) => r.data?.vcs === "git")
    .catch(() => false)
}
