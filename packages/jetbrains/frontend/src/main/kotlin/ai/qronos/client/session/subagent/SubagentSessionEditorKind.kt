package ai.qronos.client.session.subagent

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosSessionService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.AgentAvatar
import ai.qronos.client.session.SessionUi
import ai.qronos.client.session.SessionUiFactory
import ai.qronos.client.vfs.QronosEditorKind
import ai.qronos.client.vfs.QronosEditorKindRegistry
import ai.qronos.client.vfs.QronosVirtualFile
import com.intellij.icons.AllIcons
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import kotlinx.coroutines.cancel
import java.awt.BorderLayout
import javax.swing.Icon
import javax.swing.JComponent

object SubagentSessionEditorKind : QronosEditorKind {
    const val ID = "subagent-session"

    override val id: String = ID

    override fun title(params: Map<String, String>): String {
        val id = params[SESSION]?.takeIf { it.isNotBlank() } ?: return QronosBundle.message("session.subagent.title")
        return service<SubagentTitleCache>().title(id)?.takeIf { it.isNotBlank() }
            ?: QronosBundle.message("session.subagent.title")
    }

    /**
     * Static, ID-derived identity (see [ai.qronos.client.session.AgentAvatar]) so a read-only
     * subagent tab reads with the same shape/hue as its task card and background-agent row. Falls
     * back to a generic icon only when the tab has no session id at all.
     */
    override fun icon(params: Map<String, String>): Icon {
        val id = params[SESSION]?.takeIf { it.isNotBlank() } ?: return AllIcons.Nodes.Function
        val color = service<SubagentTitleCache>().color(id)
        return AgentAvatar.static(id, color)
    }
    override fun presentablePath(params: Map<String, String>): String = QronosBundle.message("session.subagent.path", params[SESSION].orEmpty())
    override fun isValid(params: Map<String, String>): Boolean = !params[SESSION].isNullOrBlank() && !params[DIR].isNullOrBlank()

    @RequiresEdt
    override fun preferredFocus(component: JComponent): JComponent? = (component as? SubagentSessionEditorPanel)?.host?.currentFocus()

    @RequiresEdt
    override fun createContent(project: Project, file: QronosVirtualFile, parent: Disposable): JComponent {
        val id = file.path.params[SESSION]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val dir = file.path.params[DIR]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val workspace = service<QronosWorkspaceService>().workspace(dir)
        val cs = service<SessionUiFactory>().scope()
        Disposer.register(parent) { cs.cancel() }
        val host = SubagentSessionEditorHost(
            parent = parent,
            project = project,
            workspace = workspace,
            create = { p, w, manager, ref, timers ->
                SessionUi(
                    project = p,
                    workspace = w,
                    sessions = p.service<QronosSessionService>(),
                    app = service<QronosAppService>(),
                    cs = cs,
                    ref = ref,
                    manager = manager,
                    timers = timers,
                )
            },
        )
        host.open(id)
        return SubagentSessionEditorPanel(host)
    }

    private const val SESSION = "sessionId"
    private const val DIR = "directory"
}

class SubagentSessionEditorPanel(val host: SubagentSessionEditorHost) : BorderLayoutPanel() {
    init {
        add(host.component, BorderLayout.CENTER)
    }
}

fun ensureSubagentSessionEditorKind() {
    service<QronosEditorKindRegistry>().register(SubagentSessionEditorKind)
}

internal fun unregisterSubagentSessionEditorKind() {
    service<QronosEditorKindRegistry>().unregister(SubagentSessionEditorKind.ID)
}

internal fun subagentSessionParams(sessionId: String, directory: String): Map<String, String> = linkedMapOf(
    "sessionId" to sessionId,
    "directory" to directory,
)
