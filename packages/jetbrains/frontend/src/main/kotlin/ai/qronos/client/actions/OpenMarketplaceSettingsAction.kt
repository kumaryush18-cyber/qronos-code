package ai.qronos.client.actions

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.marketplace.MarketplaceConfigurable
import com.intellij.openapi.actionSystem.AnActionEvent

class OpenMarketplaceSettingsAction : OpenSettingsPageAction(
    QronosBundle.message("action.Qronos.OpenMarketplaceSettings.text"),
    QronosBundle.message("action.Qronos.OpenMarketplaceSettings.description"),
    surface = "tool_window_marketplace",
) {
    internal override fun page(e: AnActionEvent): String = MarketplaceConfigurable.ID
}
