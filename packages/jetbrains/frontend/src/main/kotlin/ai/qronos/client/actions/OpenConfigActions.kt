package ai.qronos.client.actions

import ai.qronos.client.QronosNotifications
import ai.qronos.client.agentManager.worktree.WorktreeDataKeys
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.agentManager.hosted.HostedWorkspaceDataKeys
import ai.qronos.client.telemetry.Telemetry
import ai.qronos.rpc.dto.ConfigTargetDto
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

abstract class ConfigAction(
    private val open: String,
    private val create: String,
    text: String,
    description: String,
) : AnAction(text, description, null), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    protected fun text(target: ConfigTargetDto?): String {
        val key = if (target?.exists == false) create else open
        return QronosBundle.message(key, target?.displayPath ?: "...")
    }

    protected fun failed() {
        QronosNotifications.error(QronosBundle.message("action.Qronos.OpenConfig.failed"))
    }
}

class OpenLocalConfigAction : ConfigAction(
    open = "action.Qronos.OpenLocalConfig.text",
    create = "action.Qronos.CreateLocalConfig.text",
    text = QronosBundle.message("action.Qronos.OpenLocalConfig.text", "..."),
    description = QronosBundle.message("action.Qronos.OpenLocalConfig.description"),
) {
    override fun update(e: AnActionEvent) {
        val dir = e.workspaceDirectory()
        val service = service<QronosWorkspaceService>()
        val target = dir?.let { service.localConfig[it] }
        e.presentation.isEnabled = dir != null
        e.presentation.text = text(target)

        if (dir != null && target == null) {
            service.refreshLocalConfigTarget(dir)
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val dir = e.workspaceDirectory() ?: return
        Telemetry.send("Config Opened", mapOf("surface" to "tool_window", "scope" to "local"))
        service<QronosWorkspaceService>().openLocalConfig(dir) { ok ->
            if (!ok) failed()
        }
    }
}

class OpenGlobalConfigAction : ConfigAction(
    open = "action.Qronos.OpenGlobalConfig.text",
    create = "action.Qronos.CreateGlobalConfig.text",
    text = QronosBundle.message("action.Qronos.OpenGlobalConfig.text", "..."),
    description = QronosBundle.message("action.Qronos.OpenGlobalConfig.description"),
) {
    override fun update(e: AnActionEvent) {
        val service = service<QronosWorkspaceService>()
        val target = service.globalConfig
        e.presentation.text = text(target)

        if (target == null) {
            service.refreshGlobalConfigTarget()
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("Config Opened", mapOf("surface" to "tool_window", "scope" to "global"))
        service<QronosWorkspaceService>().openGlobalConfig { ok ->
            if (!ok) failed()
        }
    }
}

class OpenSetupScriptAction : AnAction(
    QronosBundle.message("action.Qronos.OpenSetupScript.text"),
    QronosBundle.message("action.Qronos.OpenSetupScript.description"),
    null,
), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    /** Worktree-row-only: hidden on the main worktree row, like Run. */
    override fun update(e: AnActionEvent) {
        if (e.getData(HostedWorkspaceDataKeys.WORKSPACE) != null ||
            e.getData(WorktreeDataKeys.WORKTREE)?.main == true
        ) {
            e.presentation.isEnabledAndVisible = false
            return
        }
        val dir = e.workspaceDirectory()
        val service = service<QronosWorkspaceService>()
        val target = dir?.let { service.setupScript[it] }
        e.presentation.isEnabledAndVisible = dir != null
        e.presentation.text = QronosBundle.message(
            if (target?.exists == false) "action.Qronos.CreateSetupScript.text" else "action.Qronos.OpenSetupScript.text",
        )

        if (dir != null && target == null) {
            service.refreshSetupScriptTarget(dir)
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        if (e.getData(HostedWorkspaceDataKeys.WORKSPACE) != null) return
        val dir = e.workspaceDirectory() ?: return
        Telemetry.send("Worktree Setup Script Opened", mapOf("surface" to "worktree_row"))
        service<QronosWorkspaceService>().openSetupScript(dir) { ok ->
            if (!ok) QronosNotifications.error(QronosBundle.message("action.Qronos.OpenConfig.failed"))
        }
    }
}
