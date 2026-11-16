package ai.qronos.client.session.subagent

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosSessionService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.session.SessionActivityKind
import ai.qronos.client.session.SessionUi
import ai.qronos.client.testing.FakeAppRpcApi
import ai.qronos.client.testing.FakeSessionRpcApi
import ai.qronos.client.testing.FakeWorkspaceRpcApi
import ai.qronos.client.testing.TestCoroutines
import ai.qronos.client.util.UiTimers
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import ai.qronos.rpc.dto.QronosWorkspaceStateDto
import ai.qronos.rpc.dto.QronosWorkspaceStatusDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class SubagentSessionEditorHostTest : BasePlatformTestCase() {
    private lateinit var coroutines: TestCoroutines

    override fun setUp() {
        super.setUp()
        coroutines = TestCoroutines()
    }

    override fun tearDown() {
        try {
            coroutines.close()
        } finally {
            super.tearDown()
        }
    }

    fun testSubagentHostCapabilities() {
        val host = host()

        assertTrue(host.readonly)
        assertTrue(host.hostedInEditorTab)
        assertFalse(host.showsBranchDock)
    }

    fun testOpenPresentsSessionUi() {
        val host = host()

        host.open("ses_child")
        coroutines.drain()

        assertTrue(host.component.components.any { it is SessionUi })
        assertNotNull(host.currentFocus())
    }

    fun testNewSessionAndHistoryAreNoOps() {
        val host = host()

        host.newSession()
        host.showHistory()

        assertEquals(0, host.component.componentCount)
    }

    private fun host(): SubagentSessionEditorHost {
        val sessions = QronosSessionService(project, coroutines.scope, FakeSessionRpcApi())
        val app = QronosAppService(coroutines.scope, FakeAppRpcApi().also {
            it.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        })
        val workspaces = QronosWorkspaceService(coroutines.scope, FakeWorkspaceRpcApi().also {
            it.state.value = QronosWorkspaceStateDto(QronosWorkspaceStatusDto.READY)
        })
        val workspace = workspaces.workspace("/test")
        return SubagentSessionEditorHost(
            parent = testRootDisposable,
            project = project,
            workspace = workspace,
            create = { project, workspace, manager, ref, timers ->
                SessionUi(
                    project = project,
                    workspace = workspace,
                    sessions = sessions,
                    app = app,
                    cs = coroutines.scope,
                    ref = ref,
                    manager = manager,
                    workspaces = workspaces,
                    timers = timers,
                )
            },
            status = { emptyMap<String, SessionActivityKind>() },
            timers = UiTimers,
            request = {},
        )
    }
}
