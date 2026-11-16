import { InstallationVersion } from "@qronos-ai/core/installation/version"

export const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://qronos.me",
  "X-Title": "Qronos Code",
  "User-Agent": `Qronos-Code/${InstallationVersion}`,
}
