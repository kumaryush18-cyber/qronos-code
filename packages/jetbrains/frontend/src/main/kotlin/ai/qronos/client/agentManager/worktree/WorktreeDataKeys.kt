package ai.qronos.client.agentManager.worktree

import ai.qronos.rpc.dto.WorktreeDto
import com.intellij.openapi.actionSystem.DataKey

object WorktreeDataKeys {
    val WORKTREE: DataKey<WorktreeDto> = DataKey.create("ai.qronos.client.agentManager.worktree.Worktree")
}
