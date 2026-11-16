import { dict as app } from "../../i18n/zh"
import { dict as ui } from "@qronos-ai/kilo-ui/i18n/zh"
import { dict as kilo } from "@qronos-ai/kilo-i18n/zh"
import { dict as english } from "../../../agent-manager/i18n/en"
import { dict as am } from "../../../agent-manager/i18n/zh"

export default function dictionary(base: Record<string, string>): Record<string, string> {
  return { ...base, ...app, ...ui, ...kilo, ...english, ...am }
}
