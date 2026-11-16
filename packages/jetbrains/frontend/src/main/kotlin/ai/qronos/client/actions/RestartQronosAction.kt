package ai.qronos.client.actions

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.telemetry.Telemetry
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.util.concurrency.annotations.RequiresEdt

class RestartQronosAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        if (!confirmCoreLifecycle(e.project, QronosBundle.message("action.Qronos.Restart.cli.text"))) return
        Telemetry.send("CLI Restart Clicked", mapOf("surface" to "settings"))
        service<QronosAppService>().restartAsync()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = true
        if (e.place == QronosActionPlaces.connectionRetryPopup()) {
            e.presentation.text = QronosBundle.message("action.Qronos.Restart.cli.text")
        }
    }
}

@RequiresEdt
internal fun confirmCoreLifecycle(project: Project?, action: String) = Messages.showYesNoDialog(
    project,
    QronosBundle.message("action.Qronos.CoreLifecycle.confirm.message"),
    QronosBundle.message("action.Qronos.CoreLifecycle.confirm.title"),
    action,
    Messages.getCancelButton(),
    Messages.getWarningIcon(),
) == Messages.YES
