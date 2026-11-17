/**
 * Convert raw Enhance Prompt provider failures into actionable messages.
 */
export function normalizeEnhancePromptErrorMessage(raw: string): string {
  const base = raw || "Failed to enhance prompt"
  const normalized = base.toLowerCase()

  const looksLikeQuotaError =
    normalized.includes("insufficient_quota") ||
    normalized.includes("insufficient quota") ||
    normalized.includes("exceeded your current quota") ||
    (normalized.includes("quota") && normalized.includes("billing"))

  // qronos_change - a provider that answers with a body the engine cannot parse
  // (or a model that is missing) used to surface as "Unexpected server error".
  // Say what actually happened and that the draft was not touched.
  const looksLikeBadResponse =
    normalized.includes("unexpected server error") ||
    normalized.includes("invalid json") ||
    normalized.includes("json parse") ||
    normalized.includes("failed to enhance prompt") ||
    normalized.includes("no model is available")

  if (looksLikeBadResponse) {
    return (
      "Enhance Prompt could not run: the selected model returned an unusable response. " +
      "Your draft was not changed. Switch to a Qronos model in the model picker and try again."
    )
  }

  if (!looksLikeQuotaError) return base

  const details = base === "Failed to enhance prompt" ? "" : ` Provider response: ${base}`
  return (
    "Enhance Prompt failed due to provider quota/billing limits. " +
    "Check your provider account billing/quota and API access, then retry." +
    details
  )
}
