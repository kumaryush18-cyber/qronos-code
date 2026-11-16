package ai.qronos.client.session

import ai.qronos.client.app.QronosAgentBehaviorService
import ai.qronos.client.app.QronosMcpAuthService
import ai.qronos.client.session.ui.prompt.PromptPanel
import ai.qronos.client.testing.FakeAgentBehaviorRpcApi
import ai.qronos.rpc.dto.McpStatusDto
import com.intellij.openapi.application.ApplicationManager
import com.intellij.testFramework.replaceService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

class SessionUiHostedMcpTest : SessionUiTestBase() {
    fun `test hosted session does not show local mcp auth issues`() {
        val rpc = FakeAgentBehaviorRpcApi().also {
            it.mcps = listOf(McpStatusDto("anaconda", "needs_auth"))
        }
        val auth = QronosMcpAuthService(scope, QronosAgentBehaviorService(scope, rpc))
        ApplicationManager.getApplication().replaceService(
            QronosMcpAuthService::class.java,
            auth,
            testRootDisposable,
        )
        runBlocking(Dispatchers.Default) { auth.refresh(workspace.directory) }
        assertTrue(auth.needsAuth.value[workspace.directory].orEmpty().contains("anaconda"))

        val manager = object : SessionManager {
            override val hosted = true
            override fun newSession() = Unit
            override fun showHistory(back: (() -> Unit)?) = Unit
            override fun openSession(ref: SessionRef) = Unit
        }
        ui = newUi("hosted:qronos-cloud:worktree_1:ses_one", manager = manager)
        layout()
        settle()

        assertTrue(find(ui, PromptPanel::class.java)!!.issuesForTest().isEmpty())
    }
}
