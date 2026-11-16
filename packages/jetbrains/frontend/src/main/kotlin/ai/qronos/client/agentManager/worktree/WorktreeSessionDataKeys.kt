package ai.qronos.client.agentManager.worktree

import ai.qronos.rpc.dto.SessionDto
import com.intellij.openapi.actionSystem.DataKey

internal object WorktreeSessionDataKeys {
    val SESSION: DataKey<SessionDto> = DataKey.create("ai.qronos.client.agentManager.worktree.Session")
    val PANEL: DataKey<WorktreeSessionEditorPanel> = DataKey.create("ai.qronos.client.agentManager.worktree.SessionPanel")
}
