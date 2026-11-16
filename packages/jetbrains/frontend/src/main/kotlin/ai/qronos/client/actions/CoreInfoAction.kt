package ai.qronos.client.actions

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.plugin.QronosBundle
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

class CoreInfoAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) = Unit

    override fun update(e: AnActionEvent) {
        val app = service<QronosAppService>()
        val info = app.core
        if (info == null) app.fetchCoreInfoAsync()
        app.fetchBundledAsync()
        val key = if (app.bundled == true) "action.Qronos.CoreInfo.bundled" else "action.Qronos.CoreInfo.text"
        e.presentation.text = info?.let {
            QronosBundle.message(key, it.version, it.platform)
        } ?: QronosBundle.message("action.Qronos.CoreInfo.loading")
        e.presentation.description = QronosBundle.message("action.Qronos.CoreInfo.description")
        e.presentation.isEnabled = false
        e.presentation.isVisible = true
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
}
