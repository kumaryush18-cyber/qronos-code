import {
  HEADER_ORGANIZATIONID,
  HEADER_TASKID,
  HEADER_PARENT_TASKID,
  HEADER_PROJECTID,
  HEADER_TESTER,
  HEADER_EDITORNAME,
  HEADER_MACHINEID,
  HEADER_FEATURE,
  USER_AGENT_BASE,
  CONTENT_TYPE,
  DEFAULT_EDITOR_NAME,
  ENV_EDITOR_NAME,
  ENV_VERSION,
  TESTER_SUPPRESS_VALUE,
  ENV_FEATURE,
} from "./api/constants.js"

/**
 * Header constants for QronosCode API requests
 * @deprecated Use HEADER_* constants from constants.ts instead
 */
export const X_QRONOS_ORGANIZATIONID = HEADER_ORGANIZATIONID
export const X_QRONOS_TASKID = HEADER_TASKID
export const X_QRONOS_PARENT_TASKID = HEADER_PARENT_TASKID
export const X_QRONOS_PROJECTID = HEADER_PROJECTID
export const X_QRONOS_TESTER = HEADER_TESTER
export const X_QRONOS_EDITORNAME = HEADER_EDITORNAME
export const X_QRONOS_MACHINEID = HEADER_MACHINEID
export const X_QRONOS_FEATURE = HEADER_FEATURE

/**
 * Get feature header value from QRONOS_FEATURE env var.
 * Returns undefined when not set — the gateway stores NULL (unattributed).
 * Callers must explicitly set the env var to get attribution.
 */
export function getFeatureHeader(): string | undefined {
  return process.env[ENV_FEATURE] || undefined
}

/**
 * Get User-Agent header value.
 * Appends the version from QRONOS_VERSION when available.
 */
export function getUserAgent(): string {
  const version = process.env[ENV_VERSION]
  return version ? `${USER_AGENT_BASE}/${version}` : USER_AGENT_BASE
}

/**
 * Default headers for QronosCode requests
 */
export function getDefaultHeaders(): Record<string, string> {
  return {
    "User-Agent": getUserAgent(),
    "Content-Type": CONTENT_TYPE,
  }
}

/**
 * Get editor name header value
 * When QRONOS_EDITOR_NAME is set explicitly, use it verbatim (the caller is
 * responsible for including the version, e.g. "Visual Studio Code 1.114.0").
 * Otherwise defaults to "Qronos CLI" and appends QRONOS_VERSION when available.
 */
export function getEditorNameHeader(): string {
  const custom = process.env[ENV_EDITOR_NAME]
  if (custom) return custom
  const version = process.env[ENV_VERSION]
  return version ? `${DEFAULT_EDITOR_NAME} ${version}` : DEFAULT_EDITOR_NAME
}

/**
 * Build QronosCode-specific headers from metadata and options
 */
export function buildQronosHeaders(
  metadata?: { taskId?: string; projectId?: string },
  options?: {
    qronosOrganizationId?: string
    qronosTesterWarningsDisabledUntil?: number
    machineId?: string
  },
): Record<string, string> {
  const feature = getFeatureHeader()
  const headers: Record<string, string> = {
    [X_QRONOS_EDITORNAME]: getEditorNameHeader(),
    ...(feature ? { [X_QRONOS_FEATURE]: feature } : {}),
  }

  if (metadata?.taskId) {
    headers[X_QRONOS_TASKID] = metadata.taskId
  }

  if (options?.qronosOrganizationId) {
    headers[X_QRONOS_ORGANIZATIONID] = options.qronosOrganizationId

    if (metadata?.projectId) {
      headers[X_QRONOS_PROJECTID] = metadata.projectId
    }
  }

  // Add X-QRONOS-TESTER: SUPPRESS header if the setting is enabled
  if (options?.qronosTesterWarningsDisabledUntil && options.qronosTesterWarningsDisabledUntil > Date.now()) {
    headers[X_QRONOS_TESTER] = TESTER_SUPPRESS_VALUE
  }

  if (options?.machineId) {
    headers[X_QRONOS_MACHINEID] = options.machineId
  }

  return headers
}
