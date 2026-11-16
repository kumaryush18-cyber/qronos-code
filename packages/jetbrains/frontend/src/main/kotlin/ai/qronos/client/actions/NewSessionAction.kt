package ai.qronos.client.actions

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.SessionManager
import ai.qronos.client.telemetry.Telemetry
import ai.qronos.client.agentManager.SidePanelKeys
import ai.qronos.client.agentManager.SidePanelMode
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.Presentation
import com.intellij.openapi.actionSystem.ex.CustomComponentAction
import com.intellij.openapi.project.DumbAware
import javax.swing.JComponent

class NewSessionAction : AnAction(
    QronosBundle.message("action.Qronos.NewSession.text"),
    QronosBundle.message("action.Qronos.NewSession.description"),
    QronosActionIcons.add,
), DumbAware, CustomComponentAction {
    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("New Session Clicked", mapOf("surface" to "tool_window"))
        e.getData(SessionManager.KEY)?.newSession()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = e.getData(SidePanelKeys.MODE) != SidePanelMode.AGENT_MANAGER
        e.presentation.isEnabled = e.getData(SessionManager.KEY) != null
        e.presentation.icon = QronosActionIcons.add
        if (!e.isFromActionToolbar) return
        e.presentation.text = QronosBundle.message("action.Qronos.NewSession.toolbar")
    }

    override fun createCustomComponent(presentation: Presentation, place: String): JComponent =
        titleButton(presentation, place)
}
