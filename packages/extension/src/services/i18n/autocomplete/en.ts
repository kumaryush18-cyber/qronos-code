// English runtime translations for autocomplete (qronos:autocomplete.* namespace)
// Source: src/i18n/locales/en/qronos.json → "autocomplete" section

export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) Autocomplete",
  "qronos:autocomplete.statusBar.snoozed": "snoozed",
  "qronos:autocomplete.statusBar.warning": "$(warning) Autocomplete",
  "qronos:autocomplete.statusBar.tooltip.basic": "Qronos Code Autocomplete",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**No autocomplete model configured**\n\nTo enable autocomplete, add a profile with one of these supported providers: {{providers}}.\n\n[Open Settings]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "Performed {{count}} completions between {{startTime}} and {{endTime}}, for a total cost of {{cost}}.",
  "qronos:autocomplete.statusBar.tooltip.providerInfo": "Autocompletions provided by {{model}} via {{provider}}.",
  "qronos:autocomplete.statusBar.cost.zero": "$0.00",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "qronos:autocomplete.codeAction.title": "Qronos Code: Suggested Edits",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "The Qronos Code Autocomplete is being blocked by a conflict with GitHub Copilot. To fix this, you must disable Copilot's inline suggestions.",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Disable Copilot",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Disable Autocomplete",
  "qronos:autocomplete.creditsExhausted.message":
    "Qronos Code Autocomplete has been paused. Possible causes: your Qronos account has no remaining credits, or your configured API key (BYOK) has reached its quota limit. Add Qronos credits or check your API key configuration to resume autocomplete.",
  "qronos:autocomplete.creditsExhausted.addCredits": "Add Credits",
  "qronos:autocomplete.authError.message":
    "Qronos Code Autocomplete has been paused due to an authentication issue. Possible causes: you are not signed in to Qronos, or your API key (BYOK) is invalid or missing. Please sign in again or check your provider API key settings.",
}
