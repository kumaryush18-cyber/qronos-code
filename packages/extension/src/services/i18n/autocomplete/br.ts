export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) Autocompletar",
  "qronos:autocomplete.statusBar.snoozed": "adiado",
  "qronos:autocomplete.statusBar.warning": "$(warning) Autocompletar",
  "qronos:autocomplete.statusBar.tooltip.basic": "Autocompletar do Qronos Code",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**Nenhum modelo de autocompletar configurado**\n\nPara ativar o autocompletar, adicione um perfil com um destes provedores compatíveis: {{providers}}.\n\n[Abrir Configurações]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "Foram realizadas {{count}} conclusões entre {{startTime}} e {{endTime}}, com custo total de {{cost}}.",
  "qronos:autocomplete.statusBar.tooltip.providerInfo": "Autocompletar fornecido por {{model}} via {{provider}}.",
  "qronos:autocomplete.statusBar.cost.zero": "$0.00",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "qronos:autocomplete.codeAction.title": "Qronos Code: Edições sugeridas",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "O Autocompletar do Qronos Code está sendo bloqueado por um conflito com o GitHub Copilot. Para corrigir isso, você deve desativar as sugestões inline do Copilot.",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Desativar Copilot",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Desativar Autocompletar",
  "qronos:autocomplete.creditsExhausted.message":
    "O Autocompletar do Qronos Code foi pausado. Possíveis causas: sua conta Qronos não tem créditos restantes, ou sua chave de API configurada (BYOK) atingiu o limite de cota. Adicione créditos Qronos ou verifique a configuração da sua chave de API para retomar o autocompletar.",
  "qronos:autocomplete.creditsExhausted.addCredits": "Adicionar créditos",
  "qronos:autocomplete.authError.message":
    "O Autocompletar do Qronos Code foi pausado devido a um problema de autenticação. Possíveis causas: você não está conectado ao Qronos, ou sua chave de API (BYOK) é inválida ou está ausente. Entre novamente ou verifique as configurações da chave de API do provedor.",
}
