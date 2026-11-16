export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) Autofuldførelse",
  "qronos:autocomplete.statusBar.snoozed": "udsat",
  "qronos:autocomplete.statusBar.warning": "$(warning) Autofuldførelse",
  "qronos:autocomplete.statusBar.tooltip.basic": "Qronos Code autofuldførelse",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**Ingen autocomplete-model konfigureret**\n\nFor at aktivere autocomplete skal du tilføje en profil med en af disse understøttede udbydere: {{providers}}.\n\n[Åbn indstillinger]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "Udførte {{count}} fuldførelser mellem {{startTime}} og {{endTime}}, til en samlet pris på {{cost}}.",
  "qronos:autocomplete.statusBar.tooltip.providerInfo": "Autocomplete leveres af {{model}} via {{provider}}.",
  "qronos:autocomplete.statusBar.cost.zero": "$0.00",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "qronos:autocomplete.codeAction.title": "Qronos Code: Foreslåede redigeringer",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "Qronos Code autofuldførelse blokeres af en konflikt med GitHub Copilot. For at løse dette skal du deaktivere Copilots inline-forslag.",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Deaktiver Copilot",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Deaktiver Autocomplete",
  "qronos:autocomplete.creditsExhausted.message":
    "Qronos Code autofuldførelse er sat på pause. Mulige årsager: din Qronos-konto har ingen resterende credits, eller din konfigurerede API-nøgle (BYOK) har nået sin kvotegrænse. Tilføj Qronos-credits eller kontroller din API-nøglekonfiguration for at genoptage autocomplete.",
  "qronos:autocomplete.creditsExhausted.addCredits": "Tilføj credits",
  "qronos:autocomplete.authError.message":
    "Qronos Code autofuldførelse er sat på pause på grund af et godkendelsesproblem. Mulige årsager: du er ikke logget ind på Qronos, eller din API-nøgle (BYOK) er ugyldig eller mangler. Log ind igen, eller kontroller indstillingerne for udbyderens API-nøgle.",
}
