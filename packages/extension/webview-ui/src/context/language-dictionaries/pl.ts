import { dict as app } from "../../i18n/pl"
import { dict as ui } from "@qronos-ai/ui-kit/i18n/pl"
import { dict as qronos } from "@qronos-ai/i18n/pl"
import { dict as english } from "../../../agent-manager/i18n/en"
import { dict as am } from "../../../agent-manager/i18n/pl"

export default function dictionary(base: Record<string, string>): Record<string, string> {
  return { ...base, ...app, ...ui, ...qronos, ...english, ...am }
}
