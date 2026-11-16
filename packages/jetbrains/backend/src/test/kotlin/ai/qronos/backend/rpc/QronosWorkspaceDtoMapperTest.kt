package ai.qronos.backend.rpc

import ai.qronos.backend.app.ConfigWarning
import ai.qronos.backend.workspace.ModelInfo
import ai.qronos.backend.workspace.ModelCostInfo
import ai.qronos.backend.workspace.ModelOptionsInfo
import ai.qronos.backend.workspace.ModelTerminalBenchInfo
import ai.qronos.backend.workspace.ProviderData
import ai.qronos.backend.workspace.ProviderInfo
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class QronosWorkspaceDtoMapperTest {

    @Test
    fun `providers preserve prompt training disclosure`() {
        val model = ModelInfo(
            id = "paid",
            name = "Paid",
            attachment = false,
            reasoning = false,
            temperature = false,
            toolCall = true,
            free = false,
            status = null,
            recommendedIndex = null,
            variants = emptyList(),
            limit = null,
            mayTrainOnYourPrompts = true,
        )
        val data = ProviderData(
            providers = listOf(
                ProviderInfo(
                    id = "qronos",
                    name = "Qronos",
                    source = "api",
                    models = mapOf(model.id to model),
                ),
            ),
            connected = listOf("qronos"),
            defaults = emptyMap(),
        )

        val result = QronosWorkspaceDtoMapper.providers(data)

        assertTrue(result.providers.single().models.getValue("paid").mayTrainOnYourPrompts)
    }

    @Test
    fun `providers preserve model preview metadata`() {
        val model = ModelInfo(
            id = "auto",
            name = "Auto",
            inputPrice = 0.1,
            outputPrice = 0.2,
            contextLength = 128000,
            releaseDate = "2026-06-01",
            latest = true,
            attachment = false,
            reasoning = true,
            temperature = false,
            toolCall = true,
            free = false,
            status = null,
            recommendedIndex = null,
            variants = emptyList(),
            limit = null,
            cost = ModelCostInfo(0.1, 0.2),
            options = ModelOptionsInfo("Preview text"),
            terminalBench = ModelTerminalBenchInfo(0.5, 2.0),
        )
        val data = ProviderData(
            providers = listOf(ProviderInfo("qronos", "Qronos", "api", mapOf(model.id to model))),
            connected = listOf("qronos"),
            defaults = emptyMap(),
        )

        val result = QronosWorkspaceDtoMapper.providers(data).providers.single().models.getValue("auto")

        assertEquals(0.1, result.inputPrice)
        assertEquals(0.2, result.outputPrice)
        assertEquals(128000L, result.contextLength)
        assertEquals("2026-06-01", result.releaseDate)
        assertEquals(true, result.latest)
        assertEquals(0.1, result.cost?.input)
        assertEquals("Preview text", result.options?.description)
        assertEquals(0.5, result.terminalBench?.overallScore)
    }

    @Test
    fun `warning maps path, message and detail`() {
        val warning = ConfigWarning(path = ".qronos/qronos.json", message = "Invalid JSON", detail = "CloseBraceExpected")

        val dto = QronosWorkspaceDtoMapper.warning(warning)

        assertEquals(".qronos/qronos.json", dto.path)
        assertEquals("Invalid JSON", dto.message)
        assertEquals("CloseBraceExpected", dto.detail)
    }

    @Test
    fun `warning maps missing detail to null`() {
        val warning = ConfigWarning(path = ".qronos/qronos.json", message = "Invalid JSON")

        val dto = QronosWorkspaceDtoMapper.warning(warning)

        assertNull(dto.detail)
    }
}
