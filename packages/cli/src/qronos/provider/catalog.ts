import type { Auth } from "@/auth"
import { fetchDefaultModel, getQronosUrlFromToken, QRONOS_API_BASE } from "@qronos-ai/gateway"

type Options = { qronosOrganizationId?: string; baseURL?: string; apiKey?: string; qronosToken?: string }

export function token(options: Options | undefined, info: Auth.Info | undefined) {
  // qronos_change - the stored key comes first. Signing in rotates the key and
  // revokes the old one, while process.env.QRONOS_API_KEY is captured once when
  // the process starts; preferring the env copy made a fresh sign-in answer 401
  // until the process restarted. Users with only an env key still work, because
  // `info` is then undefined.
  if (info?.type === "oauth") return info.access
  if (info?.type === "api") return info.key
  if (process.env.QRONOS_API_KEY) return process.env.QRONOS_API_KEY
  if (options?.qronosToken != null) return options.qronosToken
  return options?.apiKey || undefined
}

function scoped(url: string) {
  return URL.parse(url)
    ?.pathname.match(/\/api\/organizations\/([^/]+)/)
    ?.at(1)
}

export function organization(options: Options | undefined, info: Auth.Info | undefined) {
  return (
    process.env.QRONOS_ORG_ID ||
    (info?.type === "oauth" ? info.accountId : undefined) ||
    options?.qronosOrganizationId ||
    scoped(getQronosUrlFromToken(options?.baseURL ?? "", token(options, info) ?? ""))
  )
}

export function compatible(options: { baseURL?: string; qronosToken?: string; qronosOrganizationId?: string }) {
  const org = scoped(getQronosUrlFromToken(options.baseURL ?? "", options.qronosToken ?? ""))
  return !org || !options.qronosOrganizationId || org === options.qronosOrganizationId
}

export async function recommend(
  models: Readonly<Record<string, unknown>>,
  options: Options | undefined,
  info: Auth.Info | undefined,
  known = true,
) {
  const first = Object.keys(models).at(0)
  if (!first || !known) return first
  const org = organization(options, info)
  const key = token(options, info)
  if (!compatible({ baseURL: options?.baseURL, qronosToken: key, qronosOrganizationId: org })) return undefined
  const fallback = org ? first : undefined
  const endpoint = getQronosUrlFromToken(options?.baseURL || QRONOS_API_BASE, key ?? "")
  if (URL.parse(endpoint)?.origin !== URL.parse(QRONOS_API_BASE)?.origin) return fallback
  const model = await fetchDefaultModel(key, org, fallback)
  return Object.hasOwn(models, model) ? model : fallback
}
