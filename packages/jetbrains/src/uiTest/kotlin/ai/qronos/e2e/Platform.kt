package ai.qronos.e2e

import com.intellij.driver.client.Remote
import com.intellij.driver.model.RdTarget
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.ui.remote.Component

const val QRONOS_PLUGIN_ID = "ai.qronos.jetbrains"
const val QRONOS_FRONTEND_MODULE = "$QRONOS_PLUGIN_ID/qronos.jetbrains.frontend"
const val QRONOS_BACKEND_MODULE = "$QRONOS_PLUGIN_ID/qronos.jetbrains.backend"
const val QRONOS_TOOL_WINDOW_ID = "Qronos Code"
const val QRONOS_CLOUD_PROVIDER_ID = "qronos-cloud"

@Remote("com.intellij.openapi.application.ApplicationManager")
interface ApplicationManager {
    fun getApplication(): Application
}

@Remote("com.intellij.openapi.application.Application")
interface Application {
    fun isDispatchThread(): Boolean
}

@Remote("com.intellij.util.EnvironmentUtil")
interface Environment {
    fun getValue(name: String): String?
}

@Remote("com.intellij.openapi.wm.ToolWindowManager")
interface ToolWindowManager {
    fun getInstance(project: Project): ToolWindowManager
    fun getToolWindow(id: String): ToolWindow?
}

@Remote("com.intellij.openapi.wm.ToolWindow")
interface ToolWindow {
    fun getId(): String
    fun isVisible(): Boolean
    fun show()
    fun getComponent(): Component
    fun getContentManager(): ContentManager
}

@Remote("com.intellij.ui.content.ContentManager")
interface ContentManager {
    fun getContents(): Array<Content>
    fun getSelectedContent(): Content?
    fun setSelectedContent(content: Content, requestFocus: Boolean)
}

@Remote("com.intellij.ui.content.Content")
interface Content {
    fun getDisplayName(): String
    fun getComponent(): Component
}

@Remote("ai.qronos.client.app.QronosAppService", plugin = QRONOS_FRONTEND_MODULE)
interface FrontendAppService {
    fun getVersion(): String?
    fun getBundled(): Boolean?
}

@Remote(
    "ai.qronos.backend.app.QronosBackendAppService",
    plugin = QRONOS_BACKEND_MODULE,
    rdTarget = RdTarget.BACKEND,
)
interface BackendAppService {
    fun getPort(): Int
}

@Remote("ai.qronos.backend.cli.QronosProps", plugin = QRONOS_BACKEND_MODULE, rdTarget = RdTarget.BACKEND)
interface CliProps {
    fun pinned(): Boolean
    fun cliVersion(): String?
}

@Remote("ai.qronos.client.session.ui.prompt.PromptPanel", plugin = QRONOS_FRONTEND_MODULE)
interface PromptPanel {
    fun setText(value: String)
    fun send()
    fun isSendEnabled(): Boolean
}

@Remote("ai.qronos.client.session.ui.SessionMessageListPanel", plugin = QRONOS_FRONTEND_MODULE)
interface SessionMessageListPanel {
    fun turnCount(): Int
    fun dump(): String
    fun dumpDetailed(): String
    fun messageText(role: String): String
    fun messageErrors(): String
    fun stateName(): String
    fun stateMessage(): String?
    fun sessionId(): String?
}

@Remote("ai.qronos.client.ui.active.ActiveItem", plugin = QRONOS_FRONTEND_MODULE)
interface ActiveItem {
    val key: String
    val tooltip: String?
}

@Remote("ai.qronos.client.ui.tree.ActiveTree", plugin = QRONOS_FRONTEND_MODULE)
interface ActiveTree {
    fun select(key: String, scroll: Boolean): Boolean
    fun selected(): ActiveItem?
}

@Remote("ai.qronos.client.agentManager.WorkspaceSessionEditorPanel", plugin = QRONOS_FRONTEND_MODULE)
interface WorkspaceSessionEditorPanel {
    @Suppress("FunctionName")
    fun `getList$frontend`(): ActiveList
}

@Remote("ai.qronos.client.ui.tree.ActiveTreeView", plugin = QRONOS_FRONTEND_MODULE)
interface ActiveTreeView {
    @Suppress("FunctionName")
    fun `open$frontend`(item: ActiveItem, focus: Boolean)
}

@Remote("ai.qronos.client.ui.list.ActiveList", plugin = QRONOS_FRONTEND_MODULE)
interface ActiveList {
    fun select(key: String, scroll: Boolean): Boolean
    fun selected(): ActiveItem?
    fun focusList()
}
