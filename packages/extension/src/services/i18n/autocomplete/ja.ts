export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) オートコンプリート",
  "qronos:autocomplete.statusBar.snoozed": "一時停止中",
  "qronos:autocomplete.statusBar.warning": "$(warning) オートコンプリート",
  "qronos:autocomplete.statusBar.tooltip.basic": "Qronos Code オートコンプリート",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**オートコンプリートモデルが設定されていません**\n\nオートコンプリートを有効にするには、次の対応プロバイダーのいずれかを含むプロファイルを追加してください: {{providers}}。\n\n[設定を開く]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "{{startTime}} から {{endTime}} までに {{count}} 件の補完を実行し、合計コストは {{cost}} でした。",
  "qronos:autocomplete.statusBar.tooltip.providerInfo":
    "オートコンプリートは {{provider}} 経由の {{model}} によって提供されています。",
  "qronos:autocomplete.statusBar.cost.zero": "$0.00",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "qronos:autocomplete.codeAction.title": "Qronos Code: 提案された編集",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "Qronos Code オートコンプリートは GitHub Copilot との競合によりブロックされています。修正するには、Copilot のインライン提案を無効にする必要があります。",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Copilot を無効化",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "オートコンプリートを無効化",
  "qronos:autocomplete.creditsExhausted.message":
    "Qronos Code オートコンプリートは一時停止されました。考えられる原因: Qronos アカウントに残りクレジットがない、または設定済みの API キー (BYOK) がクォータ上限に達しています。オートコンプリートを再開するには、Qronos クレジットを追加するか API キー設定を確認してください。",
  "qronos:autocomplete.creditsExhausted.addCredits": "クレジットを追加",
  "qronos:autocomplete.authError.message":
    "Qronos Code オートコンプリートは認証の問題により一時停止されました。考えられる原因: Qronos にサインインしていない、または API キー (BYOK) が無効または不足しています。再度サインインするか、プロバイダーの API キー設定を確認してください。",
}
