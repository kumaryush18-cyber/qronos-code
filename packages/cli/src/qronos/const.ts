import { InstallationVersion } from "@qronos-ai/core/installation/version"

export const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://qronos.me",
  "X-Title": "Qronos Code",
  "User-Agent": `Qronos-Code/${InstallationVersion}`,
  // qronos_change start - tell the gateway which client this is, so the admin
  // live-request panel can separate Qronos Code (editor) from Qronos CLI
  // (terminal). The extension spawns the backend with QRONOS_CLIENT=vscode.
  "X-Qronos-Client": process.env.QRONOS_CLIENT === "vscode" ? "code" : "cli",
  // qronos_change end
}
