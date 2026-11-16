export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) Saisie automatique",
  "qronos:autocomplete.statusBar.snoozed": "mis en pause",
  "qronos:autocomplete.statusBar.warning": "$(warning) Saisie automatique",
  "qronos:autocomplete.statusBar.tooltip.basic": "Saisie automatique Qronos Code",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**Aucun modèle de saisie automatique configuré**\n\nPour activer la saisie automatique, ajoutez un profil avec l'un de ces fournisseurs pris en charge : {{providers}}.\n\n[Ouvrir les paramètres]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "{{count}} complétions effectuées entre {{startTime}} et {{endTime}}, pour un coût total de {{cost}}.",
  "qronos:autocomplete.statusBar.tooltip.providerInfo":
    "Saisies automatiques fournies par {{model}} via {{provider}}.",
  "qronos:autocomplete.statusBar.cost.zero": "$0.00",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "qronos:autocomplete.codeAction.title": "Qronos Code : modifications suggérées",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "La saisie automatique Qronos Code est bloquée par un conflit avec GitHub Copilot. Pour résoudre ce problème, vous devez désactiver les suggestions en ligne de Copilot.",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Désactiver Copilot",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Désactiver la saisie automatique",
  "qronos:autocomplete.creditsExhausted.message":
    "La saisie semi-automatique de Qronos Code a été mise en pause. Causes possibles : votre compte Qronos n’a plus de crédits, ou votre clé API configurée (BYOK) a atteint sa limite de quota. Ajoutez des crédits Qronos ou vérifiez la configuration de votre clé API pour reprendre la saisie semi-automatique.",
  "qronos:autocomplete.creditsExhausted.addCredits": "Ajouter des crédits",
  "qronos:autocomplete.authError.message":
    "La saisie semi-automatique de Qronos Code a été mise en pause en raison d’un problème d’authentification. Causes possibles : vous n’êtes pas connecté à Qronos, ou votre clé API (BYOK) est invalide ou manquante. Reconnectez-vous ou vérifiez les paramètres de clé API de votre fournisseur.",
}
