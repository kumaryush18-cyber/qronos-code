package ai.qronos.client.agentManager.hosted

import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.ui.layout.HAlign
import ai.qronos.client.ui.layout.VAlign
import ai.qronos.client.ui.layout.align
import ai.qronos.client.app.QronosHostedService
import ai.qronos.client.vfs.QronosEditorKind
import ai.qronos.client.vfs.QronosEditorKindRegistry
import ai.qronos.client.vfs.QronosVirtualFile
import ai.qronos.client.vfs.QronosVfsManager
import ai.qronos.client.agentManager.worktree.WorktreeEditorMatcher
import ai.qronos.client.agentManager.worktree.WorktreeEditorMatchers
import ai.qronos.rpc.dto.HostedIDs
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.components.JBLabel
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import javax.swing.Icon
import javax.swing.JComponent

/**
 * Editor identity for one Cloud workspace: its provider and workspace ids, never a local path.
 * Sessions inside it are selected through hosted [SessionRef] keys.
 */
object HostedWorkspaceEditorKind : QronosEditorKind {
    const val ID = "hosted-workspace"
    const val PROVIDER = "provider"
    const val WORKSPACE = "workspace"
    const val PENDING_PREFIX = "pending-"

    override val id: String = ID

    override fun title(params: Map<String, String>): String {
        val ref = HostedWorkspaceRefDto(params[PROVIDER].orEmpty(), params[WORKSPACE].orEmpty())
        val cache = service<HostedWorkspaceCache>()
        val dto = cache.get(ref)
        return cache.title(ref)
            ?: HostedWorkspaceTitle.text(dto?.name, dto?.branch, params[WORKSPACE].orEmpty())
    }

    override fun icon(params: Map<String, String>): Icon = HostedWorkspaceIcons.cloud
    override fun fileType(params: Map<String, String>): FileType = HostedWorkspaceFileType
    override fun presentablePath(params: Map<String, String>): String = title(params)
    override fun isValid(params: Map<String, String>): Boolean =
        !params[PROVIDER].isNullOrBlank() && !params[WORKSPACE].isNullOrBlank()

    @RequiresEdt
    override fun preferredFocus(component: JComponent): JComponent? =
        (component as? HostedWorkspaceEditorPanel)?.preferredFocus()

    @RequiresEdt
    override fun createContent(project: Project, file: QronosVirtualFile, parent: Disposable): JComponent {
        val provider = file.path.params[PROVIDER]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val workspace = file.path.params[WORKSPACE]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val ref = HostedWorkspaceRefDto(provider, workspace)
        val hosted = project.service<QronosHostedService>()
        if (!hosted.enabled() || project.service<HostedManagementService>().excluded(ref)) {
            return BorderLayoutPanel()
        }
        if (workspace.startsWith(PENDING_PREFIX)) {
            return BorderLayoutPanel().apply {
                addToCenter(JBLabel(QronosBundle.message("hosted.workspace.progress.creating")).align(HAlign.CENTER, VAlign.CENTER))
            }
        }
        val dto = service<HostedWorkspaceCache>().get(ref)
        return HostedWorkspaceEditorPanel(
            parent = parent,
            project = project,
            ref = ref,
            name = dto?.name,
            branch = dto?.branch,
        )
    }
}

object HostedWorkspaceFileType : FileType {
    override fun getName(): String = "QRONOS_HOSTED_WORKSPACE"
    override fun getDisplayName(): String = "Qronos Cloud workspace"
    override fun getDescription(): String = "A Cloud workspace served through the local Session Host"
    override fun getDefaultExtension(): String = "qronos-cloud-workspace"
    override fun getIcon(): Icon = HostedWorkspaceIcons.cloud
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
    override fun getCharset(file: VirtualFile, content: ByteArray): String? = null
}

object HostedWorkspaceEditorMatcher : WorktreeEditorMatcher {
    override fun match(file: VirtualFile): String? {
        val qronos = file as? QronosVirtualFile ?: return null
        if (qronos.path.kind != HostedWorkspaceEditorKind.ID) return null
        val provider = qronos.path.params[HostedWorkspaceEditorKind.PROVIDER] ?: return null
        val workspace = qronos.path.params[HostedWorkspaceEditorKind.WORKSPACE] ?: return null
        return HostedIDs.workspace(provider, workspace)
    }
}

fun ensureHostedWorkspaceEditorKind() {
    service<QronosEditorKindRegistry>().register(HostedWorkspaceEditorKind)
}

internal fun hostedWorkspaceParams(dto: HostedWorkspaceDto): Map<String, String> =
    buildMap {
        put(HostedWorkspaceEditorKind.PROVIDER, dto.ref.providerID)
        put(HostedWorkspaceEditorKind.WORKSPACE, dto.ref.workspaceID)
    }

internal fun openHostedWorkspace(project: Project, dto: HostedWorkspaceDto, focus: Boolean = true) {
    ensureHostedWorkspaceEditorKind()
    service<HostedWorkspaceCache>().put(dto, HostedWorkspaceTitle.text(dto))
    project.service<WorktreeEditorMatchers>().register(HostedWorkspaceEditorMatcher)
    project.service<QronosVfsManager>().open(HostedWorkspaceEditorKind.ID, hostedWorkspaceParams(dto), focus)
}

internal fun hostedWorkspaceRoot(project: Project): ai.qronos.client.app.Workspace =
    project.service<QronosWorkspaceService>().workspace(project.basePath.orEmpty())
