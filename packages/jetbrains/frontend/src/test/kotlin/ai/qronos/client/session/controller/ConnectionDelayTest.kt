package ai.qronos.client.session.controller

import ai.qronos.rpc.dto.ConfigWarningDto
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import ai.qronos.rpc.dto.QronosWorkspaceStateDto
import ai.qronos.rpc.dto.QronosWorkspaceStatusDto
import ai.qronos.rpc.dto.LoadErrorDto
import com.intellij.openapi.util.Disposer

class ConnectionDelayTest : SessionControllerTestBase() {

    fun `test short connecting state does not fire connection banner`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 100)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(25)
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        pause(150)

        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowConnecting })
    }

    fun `test persistent connecting state fires connection banner after delay`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(20)
        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowConnecting })

        pause(80)

        assertEquals(1, events.count { it is SessionControllerEvent.ConnectionChanged.ShowConnecting })
    }

    fun `test connecting event sees updated connection state on EDT`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val states = collectStates(m)
        flush()
        states.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(80)

        val state = states.single { it.first is SessionControllerEvent.ConnectionChanged.ShowConnecting }.second
        assertEquals(SessionControllerEvent.ConnectionChanged.ShowConnecting, state.connectionState)
    }

    fun `test short app error is suppressed`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 100)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.ERROR, error = "boom")
        pause(25)
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        pause(150)

        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowError })
    }

    fun `test persistent app error fires latest error after delay`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(
            status = QronosAppStatusDto.ERROR,
            error = "CLI startup failed",
            errors = listOf(
                LoadErrorDto(resource = "connection", detail = "stderr line"),
                LoadErrorDto(resource = "config", detail = "HTTP 500"),
            ),
        )
        pause(80)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>().single()
        assertEquals("Connection failed", event.summary)
        assertEquals("stderr line\nconfig: HTTP 500", event.detail)
    }

    fun `test changed error restarts delay and shows latest state`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 100)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.ERROR, error = "first")
        pause(50)
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.ERROR, error = "second")
        pause(150)

        val errors = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>()
        assertEquals(listOf("Connection failed"), errors.map { it.summary })
        assertEquals(listOf("second"), errors.map { it.detail })
    }

    fun `test persistent workspace error is delayed`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        projectRpc.state.value = QronosWorkspaceStateDto(
            status = QronosWorkspaceStatusDto.ERROR,
            error = "workspace failed",
            errors = listOf(LoadErrorDto(resource = "providers", detail = "bad provider json")),
        )
        pause(20)
        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowError })

        pause(80)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>().single()
        assertEquals("Workspace loading failed", event.summary)
        assertEquals("providers: bad provider json", event.detail)
    }

    fun `test persistent unsupported workspace shows standard workspace error`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        projectRpc.state.value = QronosWorkspaceStateDto(
            status = QronosWorkspaceStatusDto.UNSUPPORTED,
            error = "wsl_virtual_filesystem",
        )
        pause(20)
        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowError })

        pause(80)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>().single()
        assertEquals("Workspace not supported", event.summary)
        assertEquals(
            "Workspace path: /test\n\n" +
                "Qronos runs on your host machine, so it can't reach the files inside WSL.\n\n" +
                "Option 1: Open the project in the container or WSL with JetBrains Gateway so Qronos runs next to your code.\n" +
                "Option 2: Open the project directly from your local filesystem so Qronos can reach the files.",
            event.detail,
        )
        assertEquals("workspace", event.source)
        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowConnecting })
    }

    fun `test unsupported invalid path includes the workspace path`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        projectRpc.state.value = QronosWorkspaceStateDto(
            status = QronosWorkspaceStatusDto.UNSUPPORTED,
            error = "invalid_virtual_path",
        )
        pause(80)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>().single()
        assertEquals("Workspace not supported", event.summary)
        assertEquals(
            "Workspace path: /test\n\n" +
                "Qronos can't resolve this workspace path on your local filesystem.\n\n" +
                "Option 1: Open the project in the container or WSL with JetBrains Gateway so Qronos runs next to your code.\n" +
                "Option 2: Open the project directly from your local filesystem so Qronos can reach the files.",
            event.detail,
        )
    }

    fun `test missing workspace status shows missing folder message`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        projectRpc.state.value = QronosWorkspaceStateDto(
            status = QronosWorkspaceStatusDto.MISSING,
            error = "/repo/.qronos/worktrees/deleted",
        )
        pause(80)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowError>().single()
        assertEquals("Workspace folder missing", event.summary)
        assertEquals(
            "Qronos can't load this session because the workspace folder no longer exists: /repo/.qronos/worktrees/deleted",
            event.detail,
        )
        assertEquals("workspace", event.source)
        assertFalse(event.detail.orEmpty().contains("JetBrains Gateway"))
    }

    fun `test ready hides visible delayed connection banner immediately`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(80)
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        pause(10)

        assertTrue(events.any { it is SessionControllerEvent.ConnectionChanged.Hide })
    }

    fun `test hide event sees updated connection state on EDT`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val states = collectStates(m)
        flush()
        states.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(80)
        states.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        pause(10)

        val state = states.single { it.first is SessionControllerEvent.ConnectionChanged.Hide }.second
        assertEquals(SessionControllerEvent.ConnectionChanged.Hide, state.connectionState)
    }

    fun `test config warning remains immediate`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 1_000)
        val events = collect(m)
        flush()
        events.clear()

        projectRpc.state.value = workspaceReady(
            warnings = listOf(ConfigWarningDto(path = ".qronos/qronos.json", message = "Invalid JSON")),
        )
        pause(10)

        val event = events.filterIsInstance<SessionControllerEvent.ConnectionChanged.ShowWarning>().single()
        assertEquals("Configuration warnings", event.summary)
        assertEquals(".qronos/qronos.json: Invalid JSON", event.detail)
    }

    fun `test warning event sees updated connection state on EDT`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 1_000)
        val states = collectStates(m)
        flush()
        states.clear()

        projectRpc.state.value = workspaceReady(
            warnings = listOf(ConfigWarningDto(path = ".qronos/qronos.json", message = "Invalid JSON")),
        )
        pause(10)

        val event = states.single { it.first is SessionControllerEvent.ConnectionChanged.ShowWarning }
        assertEquals(event.first, event.second.connectionState)
    }

    fun `test dispose suppresses pending delayed connection event`() {
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady()
        val m = controller(displayMs = 50)
        val events = collect(m)
        flush()
        events.clear()

        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        pause(20)
        Disposer.dispose(m)
        pause(100)

        assertFalse(events.any { it is SessionControllerEvent.ConnectionChanged.ShowConnecting })
    }
}
