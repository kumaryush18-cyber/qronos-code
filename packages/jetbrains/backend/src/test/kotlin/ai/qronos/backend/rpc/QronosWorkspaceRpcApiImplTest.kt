package ai.qronos.backend.rpc

import ai.qronos.backend.app.QronosAppState
import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.backend.testing.FakeCliServer
import ai.qronos.backend.testing.MockCliServer
import ai.qronos.backend.testing.TestLog
import ai.qronos.rpc.dto.WorkspaceFileDto
import ai.qronos.rpc.dto.ConfigPatchDto
import ai.qronos.rpc.dto.QronosWorkspaceStatusDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import java.nio.file.Files
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class QronosWorkspaceRpcApiImplTest {
    private val mock = MockCliServer()
    private val log = TestLog()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val apps = mutableListOf<QronosBackendAppService>()

    @AfterTest
    fun tearDown() = runBlocking {
        apps.forEach { it.dispose() }
        apps.clear()
        scope.cancel()
        mock.close()
    }

    @Test
    fun `searches files and directories through core`() = runBlocking {
        mock.findFiles = """["src/Main.kt",".qronos/worktrees/hidden.kt"]"""
        mock.findDirectories = """["src/","docs/"]"""
        val dir = Files.createTempDirectory("qronos-search")
        try {
            val app = app()

            val result = QronosWorkspaceRpcApiImpl(app).searchFiles(dir.toString(), "src", 3)

            assertEquals(
                listOf(
                    WorkspaceFileDto("src", "src", directory = true),
                    WorkspaceFileDto("docs", "docs", directory = true),
                    WorkspaceFileDto("src/Main.kt", "Main.kt"),
                ),
                result.files,
            )
            assertEquals(2, mock.requestCount("/find/file"))
            assertTrue(mock.findFilePaths.any { it.contains("type=file") && it.contains("query=src") })
            assertTrue(mock.findFilePaths.any { it.contains("type=directory") && it.contains("query=src") })
        } finally {
            delete(dir)
        }
    }

    @Test
    fun `state maps unsupported workspace`() = runBlocking {
        val app = app()
        val rpc = QronosWorkspaceRpcApiImpl(app)

        val state = withTimeoutOrNull(15_000) {
            rpc.state("/${'$'}devcontainer.ij/abc@u~run~user~1001~podman~podman.sock/workspaces/project")
                .first { it.status == QronosWorkspaceStatusDto.UNSUPPORTED }
        }

        assertNotNull(state)
        assertEquals(QronosWorkspaceStatusDto.UNSUPPORTED, state.status)
        assertEquals("devcontainer_virtual_filesystem", state.error)
    }

    @Test
    fun `workspace config update patches project scope and reloads effective config`() = runBlocking {
        mock.workspaceConfig = """{"snapshot":false}"""
        val app = app()
        val rpc = QronosWorkspaceRpcApiImpl(app)

        assertEquals(false, rpc.config("/repo").snapshot)
        val config = rpc.updateConfig("/repo", ConfigPatchDto(snapshot = true))

        assertTrue(requireNotNull(mock.lastWorkspaceConfigPatchPath).contains("directory=%2Frepo"))
        assertEquals("{\"snapshot\":true}", mock.lastWorkspaceConfigPatchBody)
        assertEquals(true, config.snapshot)
    }

    @Test
    fun `reload core settings calls instance reload for the workspace`() = runBlocking {
        val app = app()

        assertTrue(QronosWorkspaceRpcApiImpl(app).reloadCoreSettings("/test project"))

        assertEquals(1, mock.requestCount("/instance/reload"))
        assertTrue(requireNotNull(mock.lastInstanceReloadPath).contains("directory="))
    }

    @Test
    fun `reload core settings reports a running session conflict`() = runBlocking {
        mock.instanceReloadStatus = 409
        val app = app()

        assertFalse(QronosWorkspaceRpcApiImpl(app).reloadCoreSettings("/repo"))
    }

    private suspend fun app(): QronosBackendAppService {
        val app = QronosBackendAppService.create(scope, FakeCliServer(mock), log).also { apps.add(it) }
        app.connect()
        val state = assertNotNull(
            withTimeoutOrNull(35_000) {
                app.appState.first {
                    it is QronosAppState.Ready || it is QronosAppState.Error || it is QronosAppState.MigrationRequired
                }
            },
            "App startup timed out in ${app.appState.value}; logs=${log.messages}",
        )
        assertIs<QronosAppState.Ready>(state, "App startup failed; logs=${log.messages}")
        return app
    }

    private fun delete(dir: java.nio.file.Path) {
        Files.walk(dir).use { paths ->
            paths.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
        }
    }
}
