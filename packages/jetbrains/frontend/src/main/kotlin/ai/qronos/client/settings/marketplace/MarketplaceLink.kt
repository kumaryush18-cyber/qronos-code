package ai.qronos.client.settings.marketplace

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.telemetry.Telemetry
import com.intellij.ide.DataManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.options.ex.Settings
import com.intellij.openapi.project.DumbAwareAction
import javax.swing.JComponent

/**
 * Toolbar action that jumps to the Marketplace settings page. Used from the Agents, MCP Servers, and
 * Skills pages, each of which lets a user configure by hand what Marketplace can install directly.
 */
internal fun marketplaceAction(surface: String): AnAction = object : DumbAwareAction(
    QronosBundle.message("settings.marketplace.displayName"),
    QronosBundle.message("action.Qronos.OpenMarketplaceSettings.description"),
    null,
) {
    init {
        templatePresentation.putClientProperty(ActionUtil.SHOW_TEXT_IN_TOOLBAR, true)
    }

    override fun getActionUpdateThread() = ActionUpdateThread.EDT

    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("Settings Opened", mapOf("surface" to surface))
        val src = e.inputEvent?.source as? JComponent
        val ctx = src?.let { DataManager.getInstance().getDataContext(it) } ?: e.dataContext
        val settings = Settings.KEY.getData(ctx) ?: return
        settings.find(MarketplaceConfigurable.ID)?.let { settings.select(it) }
    }
}
