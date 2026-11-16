declare global {
  const QRONOS_VERSION: string
  const QRONOS_CHANNEL: string
  const QRONOS_BUILD_KIND: string // qronos_change
}

export const InstallationVersion = typeof QRONOS_VERSION === "string" ? QRONOS_VERSION : "local"
export const InstallationChannel = typeof QRONOS_CHANNEL === "string" ? QRONOS_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// qronos_change start - distinguish release builds from source / local builds
export const InstallationBuildKind: "source" | "release" =
  typeof QRONOS_BUILD_KIND === "string" && QRONOS_BUILD_KIND === "release" ? "release" : "source"
// qronos_change end
