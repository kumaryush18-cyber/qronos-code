package ai.qronos.client.actions

import ai.qronos.client.QronosNotifications
import ai.qronos.client.app.CoreReloadResult
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.telemetry.Telemetry
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project

class ReloadCoreSettingsAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        val dir = e.workspaceDirectory() ?: return
        reloadCoreSettings(service(), dir, e.project, "menu")
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = e.workspaceDirectory() != null
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT
}

internal fun reloadCoreSettings(
    service: QronosWorkspaceService,
    directory: String,
    project: Project?,
    surface: String,
) {
    Telemetry.send("Core Settings Reload Clicked", mapOf("surface" to surface))
    service.reloadCoreSettings(directory) { result ->
        when (result) {
            CoreReloadResult.SUCCESS -> Unit
            CoreReloadResult.BUSY -> QronosNotifications.warning(
                project,
                QronosBundle.message("action.Qronos.ReloadCoreSettings.busy"),
            )
            CoreReloadResult.FAILED -> QronosNotifications.error(
                project,
                QronosBundle.message("action.Qronos.ReloadCoreSettings.failed"),
            )
        }
    }
}
