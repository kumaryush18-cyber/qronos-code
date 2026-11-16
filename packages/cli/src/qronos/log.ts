import * as Log from "@qronos-ai/core/util/log"
import { InstallationBuildKind } from "@qronos-ai/core/installation/version"

export namespace QronosLog {
  export function init() {
    const value = process.env.QRONOS_LOG_LEVEL?.toUpperCase()
    const level: Log.Level =
      value === "DEBUG" || value === "INFO" || value === "WARN" || value === "ERROR"
        ? value
        : InstallationBuildKind === "release"
          ? "INFO"
          : "DEBUG"
    return Log.init({
      print: process.env.QRONOS_PRINT_LOGS === "1",
      dev: InstallationBuildKind !== "release",
      level,
    })
  }
}
