package ai.qronos.client.agentManager

import ai.qronos.client.app.QronosSessionService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.app.Workspace
import ai.qronos.client.session.SessionActivityKind
import ai.qronos.client.session.SessionHost
import ai.qronos.client.session.SessionManager
import ai.qronos.client.session.SessionRef
import ai.qronos.client.session.SessionUi
import ai.qronos.client.session.SessionUiFactory
import ai.qronos.client.util.UiTimerSource
import ai.qronos.client.util.UiTimers
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.IdeFocusManager
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import javax.swing.JComponent

/** Owns the same retained session surface and selection notifications for either backend. */
abstract class WorkspaceSessionEditorManager(
    project: Project,
    workspace: Workspace,
    create: (Project, Workspace, SessionManager, SessionRef?, UiTimerSource) -> SessionUi =
        { project, workspace, manager, ref, timers ->
            service<SessionUiFactory>().create(project, workspace, manager, ref, timers)
        },
    resolve: (String) -> Workspace = { dir -> service<QronosWorkspaceService>().workspace(dir) },
    status: () -> Map<String, SessionActivityKind> = { project.service<QronosSessionService>().activitySnapshot() },
    timers: UiTimerSource = UiTimers,
    request: (JComponent) -> Unit = { focus ->
        ApplicationManager.getApplication().invokeLater({
            IdeFocusManager.getInstance(project).requestFocusInProject(focus, project)
        }, ModalityState.defaultModalityState())
    },
) : SessionHost(project, workspace, create, resolve, status, timers, request) {
    val component = BorderLayoutPanel()
    var onPresent: ((String?) -> Unit)? = null
    var onListChanged: (() -> Unit)? = null
    override val hostedInEditorTab: Boolean get() = true

    /** A brand-new session row is waiting for its first prompt (local and hosted alike). */
    open fun hasPendingNew(): Boolean = false

    /** Session ids whose row should show delete progress instead of actions. */
    open fun deleting(): Set<String> = emptySet()

    @RequiresEdt
    override fun present(ui: SessionUi?) {
        if (component.components.firstOrNull() === ui) return
        component.removeAll()
        if (ui != null) component.addToCenter(ui)
        component.revalidate()
        component.repaint()
        onPresent?.invoke(currentKey())
    }

    /** New Session and blank-to-live creation both need the list to pick up the new state. */
    @RequiresEdt
    override fun onSessionsChanged() {
        onListChanged?.invoke()
    }
}
