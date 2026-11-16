// qronos_change - temporary diagnostics. Writes the failure reason of the
// gateway calls to a file so a packaged build can be debugged without a dev host.
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

export const DEBUG_LOG = path.join(os.tmpdir(), "qronos-ext.log")

export function debugLog(scope: string, detail: unknown): void {
  const text = detail instanceof Error ? `${detail.name}: ${detail.message}\n${detail.stack ?? ""}` : String(detail)
  try {
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} [${scope}] ${text}\n`)
  } catch {
    // never break the extension because of logging
  }
}
