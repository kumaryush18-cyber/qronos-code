import type { QronosClient } from "@qronos-ai/sdk/v2/client"

export async function stopSessionProcesses(
  client: QronosClient | null,
  sessionID: string,
  directory: string,
): Promise<void> {
  if (!client) return
  await client.backgroundProcess
    .stopSession({ sessionID, directory })
    .catch((err: unknown) => console.warn("[Qronos New] QronosProvider: Failed to stop background processes:", err))
}
