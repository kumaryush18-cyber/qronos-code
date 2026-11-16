package ai.qronos.client.agentManager.hosted

import ai.qronos.client.QronosNotifications
import ai.qronos.client.app.QronosHostedService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.ui.active.ActiveDeleteOptions
import ai.qronos.client.ui.active.showActiveDeletePopup
import ai.qronos.client.vfs.QronosVfsManager
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.ui.awt.RelativePoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Cloud workspace deletion shared by the list row and the workspace editor. The row keeps its
 * place with the same trailing progress text and spinner as a local worktree delete, then
 * disappears after Cloud confirms.
 */
@Service(Service.Level.PROJECT)
class HostedWorkspaceRemoval internal constructor(
    private val project: Project,
    private val cs: CoroutineScope,
) {
    private val _deleting = MutableStateFlow<Set<String>>(emptySet())
    val deleting: StateFlow<Set<String>> = _deleting.asStateFlow()
    private val _removed = MutableSharedFlow<HostedWorkspaceRefDto>(extraBufferCapacity = 16)
    val removed: SharedFlow<HostedWorkspaceRefDto> = _removed.asSharedFlow()

    fun isDeleting(ref: HostedWorkspaceRefDto): Boolean = ref.key in _deleting.value

    fun confirm(anchor: RelativePoint, ref: HostedWorkspaceRefDto, directory: String) {
        val opts = ActiveDeleteOptions(
            message = QronosBundle.message("hosted.workspace.delete.message"),
            detail = QronosBundle.message("hosted.workspace.delete.detail"),
        )
        showActiveDeletePopup(anchor, opts) { delete(ref, directory) }
    }

    fun delete(ref: HostedWorkspaceRefDto, directory: String) {
        if (ref.key in _deleting.value) return
        _deleting.update { it + ref.key }
        cs.launch {
            val result = project.service<QronosHostedService>().delete(ref)
            withContext(Dispatchers.Main) {
                _deleting.update { it - ref.key }
                val hosted = project.service<QronosHostedService>()
                if (!result.success) {
                    QronosNotifications.error(
                        project,
                        QronosBundle.message("hosted.workspace.delete.failed"),
                        result.failure?.message,
                        QronosBundle.message("common.retry"),
                    ) { delete(ref, directory) }
                    hosted.refresh(directory)
                    return@withContext
                }
                project.service<HostedManagementService>().forget(ref)
                service<HostedWorkspaceCache>().remove(ref)
                project.service<QronosVfsManager>().close(
                    HostedWorkspaceEditorKind.ID,
                    hostedWorkspaceParams(HostedWorkspaceDto(ref)),
                )
                _removed.tryEmit(ref)
                hosted.refresh(directory)
            }
        }
    }
}
