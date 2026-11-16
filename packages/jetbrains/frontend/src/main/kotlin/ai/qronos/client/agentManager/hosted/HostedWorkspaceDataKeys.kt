package ai.qronos.client.agentManager.hosted

import ai.qronos.rpc.dto.HostedWorkspaceDto
import com.intellij.openapi.actionSystem.DataKey

object HostedWorkspaceDataKeys {
    val WORKSPACE: DataKey<HostedWorkspaceDto> = DataKey.create("ai.qronos.client.agentManager.hosted.Workspace")
}
