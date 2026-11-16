package ai.qronos.backend.app

import ai.qronos.backend.cli.QronosBackendHttpClients
import ai.qronos.backend.testing.MockCliServer
import ai.qronos.backend.testing.TestLog
import ai.qronos.rpc.dto.ModelFavoriteUpdateDto
import ai.qronos.rpc.dto.ModelSelectionDto
import ai.qronos.rpc.dto.ModelSelectionUpdateDto
import ai.qronos.rpc.dto.ModelVariantUpdateDto
import kotlinx.coroutines.runBlocking
import java.nio.file.Files
import kotlin.io.path.createTempDirectory
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class QronosBackendModelStateManagerTest {
    private val mock = MockCliServer()
    private val log = TestLog()
    private val dir = createTempDirectory("qronos-model-state-test")
    private val http = QronosBackendHttpClients.api(mock.password)

    @AfterTest
    fun tearDown() {
        QronosBackendHttpClients.shutdown(http)
        mock.close()
        Files.walk(dir).sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }

    @Test
    fun `state loads favorites from cli model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"favorite":[{"providerID":"qronos","modelID":"auto"}],"recent":[{"providerID":"anthropic","modelID":"claude"}],"model":{"code":{"providerID":"openai","modelID":"gpt"}},"variant":{"openai/gpt":"high"}}""")
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.state()

        assertEquals(1, state.favorite.size)
        assertEquals("qronos", state.favorite[0].providerID)
        assertEquals("auto", state.favorite[0].modelID)
        assertEquals("gpt", state.model["code"]?.modelID)
        assertEquals("high", state.variant["openai/gpt"])
        assertEquals(listOf("anthropic/claude"), state.recent.map { "${it.providerID}/${it.modelID}" })
        assertEquals(1, mock.requestCount("/path"))
    }

    @Test
    fun `favorite update writes parser built model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText(
            """{"model":{"code":{"providerID":"qronos","modelID":"auto"}},"recent":[{"providerID":"openai","modelID":"gpt"}],"variant":{"qronos/auto":"fast"},"favorite":[]}""",
        )
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.favorite(ModelFavoriteUpdateDto("add", "anthropic", "claude"))
        val raw = dir.resolve("model.json").readText()

        assertEquals(listOf("anthropic/claude"), state.favorite.map { "${it.providerID}/${it.modelID}" })
        assertTrue(raw.contains("\"model\""), raw)
        assertTrue(raw.contains("\"recent\""), raw)
        assertTrue(raw.contains("\"variant\""), raw)
        assertTrue(raw.contains("claude"), raw)
    }

    @Test
    fun `selection update writes model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"favorite":[],"recent":[]}""")
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.selection(ModelSelectionUpdateDto("code", "qronos", "auto"))
        val raw = dir.resolve("model.json").readText()

        assertEquals("auto", state.model["code"]?.modelID)
        assertEquals(emptyList<ModelSelectionDto>(), state.recent)
        assertTrue(raw.contains("\"model\""), raw)
        assertTrue(raw.contains("\"recent\""), raw)
    }

    @Test
    fun `clear removes only the requested agent and keeps unrelated state`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText(
            """{"model":{"code":{"providerID":"qronos","modelID":"auto"},"plan":{"providerID":"openai","modelID":"gpt"}},"recent":[{"providerID":"openai","modelID":"gpt"}],"favorite":[{"providerID":"qronos","modelID":"auto"}],"variant":{"openai/gpt":"high"}}""",
        )
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.clear("plan")
        val raw = dir.resolve("model.json").readText()

        assertTrue("plan" !in state.model)
        assertEquals("auto", state.model["code"]?.modelID)
        assertEquals(listOf("openai/gpt"), state.recent.map { "${it.providerID}/${it.modelID}" })
        assertEquals("high", state.variant["openai/gpt"])
        assertTrue("plan" !in mgr.state().model)
        assertTrue(!raw.contains("\"plan\""), raw)
    }

    @Test
    fun `clear on a missing agent leaves model json intact`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"model":{"code":{"providerID":"qronos","modelID":"auto"}}}""")
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.clear("plan")

        assertEquals("auto", state.model["code"]?.modelID)
    }

    @Test
    fun `variant update writes model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("{}")
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.variant(ModelVariantUpdateDto("qronos/auto", "medium"))

        assertEquals("medium", state.variant["qronos/auto"])
        assertTrue(dir.resolve("model.json").readText().contains("medium"))
    }

    @Test
    fun `malformed model json returns empty favorites`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("not-json")
        val mgr = QronosBackendModelStateManager(log)
        mgr.start(http, port)

        assertTrue(mgr.state().favorite.isEmpty())
    }

    private fun start(): Int {
        val path = dir.toString().replace("\\", "/")
        mock.path = """{"home":"$path","state":"$path","config":"$path","worktree":"$path","directory":"$path"}"""
        return mock.start()
    }
}
