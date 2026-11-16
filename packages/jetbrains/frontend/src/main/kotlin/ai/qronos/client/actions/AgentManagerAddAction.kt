package ai.qronos.client.actions

import ai.qronos.client.agentManager.SidePanelKeys
import ai.qronos.client.agentManager.SidePanelMode
import ai.qronos.client.agentManager.hosted.HostedWorkspaceIcons
import ai.qronos.client.app.QronosHostedService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.telemetry.Telemetry
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.actionSystem.Presentation
import com.intellij.openapi.actionSystem.Separator
import com.intellij.openapi.actionSystem.ex.CustomComponentAction
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.ui.popup.ListPopup
import com.intellij.openapi.util.text.HtmlChunk
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBUI
import javax.swing.JComponent
import javax.swing.SwingConstants

class AgentManagerAddAction : ActionGroup(
    QronosBundle.message("action.Qronos.AgentManager.Add.text"),
    QronosBundle.message("action.Qronos.AgentManager.Add.description"),
    QronosActionIcons.add,
), DumbAware, CustomComponentAction {
    private val items = arrayOf<AnAction>(Local(), Cloud(), Separator.getInstance(), Section())

    init {
        isPopup = true
        templatePresentation.isPerformGroup = true
        templatePresentation.putClientProperty(ActionUtil.HIDE_DROPDOWN_ICON, true)
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = e.getData(SidePanelKeys.MODE) == SidePanelMode.AGENT_MANAGER
        e.presentation.isEnabled = e.getData(SidePanelKeys.WORKTREE_PANEL) != null
        e.presentation.icon = QronosActionIcons.add
        if (!e.isFromActionToolbar) return
        e.presentation.text = QronosBundle.message("action.Qronos.AgentManager.Add.toolbar")
    }

    override fun getChildren(e: AnActionEvent?): Array<AnAction> = items

    @RequiresEdt
    override fun actionPerformed(e: AnActionEvent) {
        val panel = e.getData(SidePanelKeys.WORKTREE_PANEL) ?: return
        popup(e.dataContext).showUnderneathOf(e.inputEvent?.component ?: panel.component)
    }

    @RequiresEdt
    internal fun popup(context: DataContext): ListPopup {
        val popup = JBPopupFactory.getInstance().createActionGroupPopup(
            null,
            this,
            context,
            JBPopupFactory.ActionSelectionAid.SPEEDSEARCH,
            true,
        )
        // Plain advertising text is wrapped to the menu width before popup sizing.
        popup.setAdText(HtmlChunk.text(QronosBundle.message("agentManager.add.hint")).wrapWith("html").toString(),
            SwingConstants.LEFT)
        popup.setMinimumSize(JBUI.size(360, 1))
        return popup
    }

    @RequiresEdt
    override fun createCustomComponent(presentation: Presentation, place: String): JComponent =
        titleButton(presentation, place)

    private class Local : AnAction(QronosBundle.message("agentManager.add.local")), DumbAware {
        init {
            templatePresentation.icon = AllIcons.Vcs.Branch
        }

        override fun getActionUpdateThread() = ActionUpdateThread.BGT

        override fun update(e: AnActionEvent) {
            e.presentation.isEnabled = e.getData(SidePanelKeys.WORKTREE_PANEL) != null
        }

        override fun actionPerformed(e: AnActionEvent) {
            Telemetry.send("New Worktree Clicked", mapOf("surface" to "tool_window"))
            e.getData(SidePanelKeys.WORKTREE_PANEL)?.configure()
        }
    }

    private class Cloud : AnAction(QronosBundle.message("agentManager.add.cloud")), DumbAware {
        init {
            templatePresentation.icon = HostedWorkspaceIcons.cloud
        }

        override fun getActionUpdateThread() = ActionUpdateThread.BGT

        override fun update(e: AnActionEvent) {
            val hosted = e.project?.service<QronosHostedService>()
            e.presentation.isEnabled = hosted?.enabled() == true &&
                !hosted.state.value.repositoryUrl.isNullOrBlank() &&
                e.getData(SidePanelKeys.WORKTREE_PANEL) != null
        }

        override fun actionPerformed(e: AnActionEvent) {
            val panel = e.getData(SidePanelKeys.WORKTREE_PANEL) ?: return
            Telemetry.send("Cloud Workspace Create Clicked", mapOf("surface" to "tool_window"))
            panel.createHosted(panel.component)
        }
    }

    private class Section : AnAction(QronosBundle.message("agentManager.section.new")), DumbAware {
        override fun getActionUpdateThread() = ActionUpdateThread.BGT

        override fun update(e: AnActionEvent) {
            e.presentation.isEnabled = e.getData(SidePanelKeys.WORKTREE_PANEL) != null
        }

        @RequiresEdt
        override fun actionPerformed(e: AnActionEvent) {
            e.getData(SidePanelKeys.WORKTREE_PANEL)?.createSection()
        }
    }
}
