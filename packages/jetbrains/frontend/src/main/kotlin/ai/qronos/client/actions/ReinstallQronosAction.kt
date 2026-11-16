package ai.qronos.client.actions

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.telemetry.Telemetry
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

class ReinstallQronosAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        if (!confirmCoreLifecycle(e.project, QronosBundle.message("action.Qronos.Reinstall.cli.text"))) return
        Telemetry.send("CLI Reinstall Clicked", mapOf("surface" to "settings"))
        service<QronosAppService>().reinstallAsync()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = true
        if (e.place == QronosActionPlaces.connectionRetryPopup()) {
            e.presentation.text = QronosBundle.message("action.Qronos.Reinstall.cli.text")
        }
    }
}
