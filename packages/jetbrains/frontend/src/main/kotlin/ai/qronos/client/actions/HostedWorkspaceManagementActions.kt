package ai.qronos.client.actions

import ai.qronos.client.agentManager.AgentManagerPanel
import ai.qronos.client.agentManager.SidePanelKeys
import ai.qronos.client.agentManager.hosted.HostedWorkspaceDataKeys
import ai.qronos.client.agentManager.hosted.HostedWorkspaceEditorKind
import ai.qronos.client.app.QronosAppService
import ai.qronos.client.telemetry.Telemetry
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import java.net.URLEncoder

abstract class HostedWorkspaceAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    protected fun panel(e: AnActionEvent): AgentManagerPanel? =
        e.getData(SidePanelKeys.WORKTREE_PANEL)
}

internal fun hostedWorkspaceBrowserUrl(
    ref: HostedWorkspaceRefDto,
    organizationID: String? = null,
    sessionID: String? = null,
): String {
    val base = organizationID?.takeIf { it.isNotBlank() }?.let {
        "https://app.qronos.me/organizations/${URLEncoder.encode(it, Charsets.UTF_8)}/cloud/chat"
    } ?: "https://app.qronos.me/cloud/chat"
    val query = buildList {
        add("worktreeId=${URLEncoder.encode(ref.workspaceID, Charsets.UTF_8)}")
        sessionID?.takeIf { it.isNotBlank() }?.let {
            add("sessionId=${URLEncoder.encode(it, Charsets.UTF_8)}")
        }
    }.joinToString("&")
    return "$base?$query"
}

class HostedOpenInBrowserAction : HostedWorkspaceAction() {
    override fun update(e: AnActionEvent) {
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE)
        val pending = item?.ref?.workspaceID?.startsWith(HostedWorkspaceEditorKind.PENDING_PREFIX) == true
        val available = item != null && !pending && item.deletionState != "deleted"
        e.presentation.isVisible = available
        e.presentation.isEnabled = available
    }

    override fun actionPerformed(e: AnActionEvent) {
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE) ?: return
        if (item.ref.workspaceID.startsWith(HostedWorkspaceEditorKind.PENDING_PREFIX)) return
        if (item.deletionState == "deleted") return
        val org = e.project?.getService(QronosAppService::class.java)?.state?.value?.profile?.currentOrgId
        val session = item.sessions.maxByOrNull { it.updated }?.nativeSessionID
        Telemetry.send("Cloud Open In Browser Clicked", mapOf("surface" to "workspace_row"))
        BrowserUtil.browse(hostedWorkspaceBrowserUrl(item.ref, org, session))
    }
}

class HostedDeleteWorkspaceAction : HostedWorkspaceAction() {
    override fun update(e: AnActionEvent) {
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE)
        val pending = item?.ref?.workspaceID?.startsWith(HostedWorkspaceEditorKind.PENDING_PREFIX) == true
        e.presentation.isVisible = item != null && !pending
        e.presentation.isEnabled = item != null && !pending
    }

    override fun actionPerformed(e: AnActionEvent) {
        val panel = panel(e) ?: return
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE) ?: return
        panel.deleteHosted(item)
    }
}

class HostedDismissWorkspaceAction : HostedWorkspaceAction() {
    override fun update(e: AnActionEvent) {
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE)
        val pending = item?.ref?.workspaceID?.startsWith(HostedWorkspaceEditorKind.PENDING_PREFIX) == true
        val deleted = item?.deletionState == "deleted" && !pending
        e.presentation.isVisible = deleted
        e.presentation.isEnabled = deleted
    }

    override fun actionPerformed(e: AnActionEvent) {
        val panel = panel(e) ?: return
        val item = e.getData(HostedWorkspaceDataKeys.WORKSPACE) ?: return
        panel.dismissHosted(item)
    }
}
