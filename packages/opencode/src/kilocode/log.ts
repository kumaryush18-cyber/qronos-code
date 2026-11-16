import * as Log from "@qronos-ai/core/util/log"
import { InstallationBuildKind } from "@qronos-ai/core/installation/version"

export namespace KiloLog {
  export function init() {
    const value = process.env.KILO_LOG_LEVEL?.toUpperCase()
    const level: Log.Level =
      value === "DEBUG" || value === "INFO" || value === "WARN" || value === "ERROR"
        ? value
        : InstallationBuildKind === "release"
          ? "INFO"
          : "DEBUG"
    return Log.init({
      print: process.env.KILO_PRINT_LOGS === "1",
      dev: InstallationBuildKind !== "release",
      level,
    })
  }
}
