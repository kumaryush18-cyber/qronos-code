package ai.qronos.client.agentManager.worktree

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosSessionService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.SessionUiFactory
import ai.qronos.client.vfs.QronosEditorKind
import ai.qronos.client.vfs.QronosEditorKindRegistry
import ai.qronos.client.vfs.QronosVirtualFile
import ai.qronos.client.vfs.QronosVfsManager
import ai.qronos.rpc.dto.WorktreeDto
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import kotlinx.coroutines.cancel
import javax.swing.Icon
import javax.swing.JComponent

object WorktreeSessionEditorKind : QronosEditorKind {
    const val ID = "worktree-session"

    override val id: String = ID

    override fun title(params: Map<String, String>): String = params[PATH]?.let { path ->
        service<WorktreeNameCache>().title(path)
    } ?: QronosBundle.message("worktree.session.title")
    override fun icon(params: Map<String, String>): Icon = WorktreeIcons.branch
    override fun fileType(params: Map<String, String>): FileType = WorktreeSessionFileType
    override fun presentablePath(params: Map<String, String>): String = params[PATH] ?: title(params)
    override fun isValid(params: Map<String, String>): Boolean = !params[PATH].isNullOrBlank()

    @RequiresEdt
    override fun preferredFocus(component: JComponent): JComponent? = (component as? WorktreeSessionEditorPanel)?.preferredFocus()

    @RequiresEdt
    override fun createContent(project: Project, file: QronosVirtualFile, parent: Disposable): JComponent {
        val path = file.path.params[PATH]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        // A move queues its forked session here rather than in the params, which are this editor's
        // identity: a second param would open a rival tab for the same worktree.
        val session = service<PendingWorktreeSession>().take(path)
        val worktree = service<QronosWorkspaceService>().workspace(path)
        val cs = service<SessionUiFactory>().scope()
        Disposer.register(parent) { cs.cancel() }
        val controller = WorktreeSessionListController(
            project.service<QronosSessionService>(),
            path,
            cs,
            service<QronosAppService>().state,
        )
        val manager = WorktreeSessionEditorManager(parent, project, worktree, controller, session = session)
        return WorktreeSessionEditorPanel(parent, manager, controller, worktree, project)
    }

    private const val PATH = "path"
}

fun ensureWorktreeSessionEditorKind() {
    service<QronosEditorKindRegistry>().register(WorktreeSessionEditorKind)
}

internal fun unregisterWorktreeSessionEditorKind() {
    service<QronosEditorKindRegistry>().unregister(WorktreeSessionEditorKind.ID)
}

/** Editor identity for a worktree session tab: the worktree path and nothing else. */
internal fun worktreeSessionParams(item: WorktreeDto): Map<String, String> = mapOf("path" to item.path)

internal fun openWorktreeSession(project: Project, worktree: WorktreeDto, focus: Boolean = true) {
    ensureWorktreeSessionEditorKind()
    project.service<QronosVfsManager>().open(WorktreeSessionEditorKind.ID, worktreeSessionParams(worktree), focus)
}
