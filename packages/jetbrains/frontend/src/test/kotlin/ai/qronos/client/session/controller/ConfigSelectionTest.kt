package ai.qronos.client.session.controller

import ai.qronos.client.plugin.QronosPluginSettings
import ai.qronos.rpc.dto.AgentDto
import ai.qronos.rpc.dto.AgentConfigDto
import ai.qronos.rpc.dto.ConfigDto
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import ai.qronos.rpc.dto.ModelDto
import ai.qronos.rpc.dto.ModelSelectionDto
import ai.qronos.rpc.dto.ModelStateDto
import ai.qronos.rpc.dto.ProviderDto

class ConfigSelectionTest : SessionControllerTestBase() {

    fun `test hosted model selection excludes other providers and reasoning variants`() {
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(id = "qronos", name = "Qronos", models = mapOf(
                    "opus" to ModelDto(id = "opus", name = "Opus", variants = listOf("high")),
                )),
                ProviderDto(id = "other", name = "Other", models = mapOf("model" to ModelDto(id = "model", name = "Other"))),
            ),
            connected = listOf("other"),
        )
        appRpc.models = ModelStateDto(model = mapOf("code" to ModelSelectionDto("other", "model")))
        appRpc.state.value = QronosAppStateDto(
            status = QronosAppStatusDto.READY,
            config = ConfigDto(model = "other/model"),
        )
        val hosted = controller("hosted:qronos-cloud:worktree_1:ses_one")
        collect(hosted)
        flush()
        assertEquals(listOf("qronos"), hosted.model.models.map { it.provider }.distinct())
        assertEquals("qronos/opus", hosted.model.model)
        assertTrue(hosted.model.variants.isEmpty())
        assertNull(hosted.model.variant)
        edt {
            hosted.selectModel("other", "model")
            hosted.selectVariant("high")
            hosted.prompt("hello")
        }
        flush()
        val sent = rpc.prompts.single().third
        assertEquals("qronos", sent.providerID)
        assertNull(sent.variant)
        assertNull(sent.noReply)
    }

    fun `test hosted retry replays the optimistic prompt with a new message id`() {
        val hosted = controller("hosted:qronos-cloud:worktree_1:ses_one")
        collect(hosted)
        flush()
        edt { hosted.prompt("retry me") }
        flush()
        val first = rpc.prompts.single().third
        assertTrue(hosted.model.isOptimistic(first.messageID!!))
        assertTrue(hosted.canRetryPreparation())

        edt { hosted.retryPreparation() }
        flush()

        assertEquals(2, rpc.prompts.size)
        val second = rpc.prompts[1].third
        assertEquals("retry me", second.parts.single().text)
        assertTrue(first.messageID != second.messageID)
        assertNull(hosted.model.message(first.messageID!!))
    }

    fun `test selectModel stays in its session`() {
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf(
                        "gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5"),
                        "opus" to ModelDto(id = "opus", name = "Opus"),
                    ),
                ),
            ),
        )
        val first = controller()
        val second = controller()
        collect(first)
        collect(second)
        flush()

        edt { first.selectModel("qronos", "opus") }
        flush()

        assertTrue(appRpc.selections.isEmpty())
        assertSession(
            """
            [code] [qronos/opus] [app: DISCONNECTED] [workspace: READY]
            """,
            first,
            show = false,
        )
        assertSession(
            """
            [code] [qronos/gpt-5] [app: DISCONNECTED] [workspace: READY]
            """,
            second,
            show = false,
        )
        assertTrue(first.model.modelOverride)

        app.toggleModelFavorite("qronos", "opus")
        flush()

        assertEquals("qronos/opus", first.model.model)
        assertTrue(first.model.modelOverride)
        assertEquals("qronos/gpt-5", second.model.model)
    }

    /**
     * A mode switch must stay client-side. Writing it to the CLI's global config made the CLI dispose
     * every instance it held, cancelling every running turn in every worktree.
     */
    fun `test selectAgent stays local and never patches CLI config`() {
        val m = controller()
        collect(m)
        flush()

        edt { m.selectAgent("plan") }
        flush()

        assertEquals("plan", QronosPluginSettings.getAgent())
        assertSession(
            """
            [plan] [app: DISCONNECTED] [workspace: PENDING]
            """,
            m,
            show = false,
        )
    }

    fun `test remembered mode seeds a new session ahead of the CLI default`() {
        edt { QronosPluginSettings.setAgent("plan") }
        projectRpc.state.value = workspaceReady(
            agents = listOf(
                AgentDto(name = "code", displayName = "Code", mode = "code"),
                AgentDto(name = "plan", displayName = "Plan", mode = "code"),
            ),
            default = "code",
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("plan", m.model.agent)
    }

    fun `test CLI default wins when the remembered mode no longer exists`() {
        edt { QronosPluginSettings.setAgent("removed-mode") }
        projectRpc.state.value = workspaceReady(default = "code")
        val m = controller()
        collect(m)
        flush()

        assertEquals("code", m.model.agent)
    }

    fun `test selectModel fires WorkspaceReady event`() {
        projectRpc.state.value = workspaceReady()
        val m = controller()
        val events = collect(m)
        flush()
        events.clear()

        edt { m.selectModel("qronos", "gpt-5") }
        flush()

        assertControllerEvents("WorkspaceReady", events)
    }

    fun `test clearModelOverride restores default model`() {
        appRpc.models = ModelStateDto(model = mapOf("code" to ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(agent = mapOf("code" to AgentConfigDto(model = "anthropic/claude"))),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("qronos-auto/free" to ModelDto(id = "qronos-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("qronos", "anthropic", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertTrue(m.model.modelOverride)

        edt { m.clearModelOverride() }
        flush()

        assertEquals("anthropic/claude", m.model.model)
        assertFalse(m.model.modelOverride)
        assertEquals(listOf("code"), appRpc.cleared)
        assertFalse("code" in app.models.value.model)
    }

    /**
     * The reported bug: the persisted pick outranks every config default, so a reset that left it on
     * disk looked like it worked until the next mode switch resurrected it.
     */
    fun `test clearModelOverride survives a mode switch`() {
        appRpc.models = ModelStateDto(model = mapOf("plan" to ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(model = "anthropic/claude"),
        )
        projectRpc.state.value = workspaceReady(
            agents = listOf(
                AgentDto(name = "code", displayName = "Code", mode = "code"),
                AgentDto(name = "plan", displayName = "Plan", mode = "code"),
            ),
            providers = listOf(
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("anthropic", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        edt { m.selectAgent("plan") }
        flush()
        assertEquals("openai/gpt", m.model.model)
        assertTrue(m.model.modelOverride)

        edt { m.clearModelOverride() }
        flush()
        assertEquals("anthropic/claude", m.model.model)

        edt { m.selectAgent("code") }
        flush()
        edt { m.selectAgent("plan") }
        flush()

        assertEquals("anthropic/claude", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test clearModelOverride without a saved pick skips the RPC`() {
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(model = "qronos/gpt-5"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf(
                        "gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5"),
                        "opus" to ModelDto(id = "opus", name = "Opus"),
                    ),
                ),
            ),
        )
        val m = controller()
        collect(m)
        flush()

        edt { m.selectModel("qronos", "opus") }
        flush()
        assertTrue(m.model.modelOverride)

        edt { m.clearModelOverride() }
        flush()

        assertEquals("qronos/gpt-5", m.model.model)
        assertFalse(m.model.modelOverride)
        assertTrue(appRpc.cleared.isEmpty())
    }

    fun `test global config supplies computed default`() {
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(model = "openai/gpt"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("qronos-auto/free" to ModelDto(id = "qronos-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("qronos", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.defaultModel)
        assertEquals("openai/gpt", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test recent supplies computed default when config is absent`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("anthropic", "claude")))
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY)
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("qronos-auto/free" to ModelDto(id = "qronos-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
            ),
            connected = listOf("qronos", "anthropic"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("anthropic/claude", m.model.defaultModel)
        assertEquals("anthropic/claude", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test invalid config falls through to recent`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("anthropic", "claude")))
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(model = "openai/gpt"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("qronos-auto/free" to ModelDto(id = "qronos-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("qronos", "anthropic"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("anthropic/claude", m.model.defaultModel)
        assertEquals("anthropic/claude", m.model.model)
    }

    fun `test no valid candidates falls back to qronos auto`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(model = "missing/model"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("qronos-auto/free" to ModelDto(id = "qronos-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("qronos"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("qronos/qronos-auto/free", m.model.defaultModel)
        assertEquals("qronos/qronos-auto/free", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test reset recomputes variants for computed model`() {
        appRpc.models = ModelStateDto(
            model = mapOf("code" to ModelSelectionDto("openai", "gpt")),
            variant = mapOf("anthropic/claude" to "high"),
        )
        appRpc.state.value = QronosAppStateDto(
            QronosAppStatusDto.READY,
            config = ConfigDto(agent = mapOf("code" to AgentConfigDto(model = "anthropic/claude"))),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude", variants = listOf("low", "high"))),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT", variants = listOf("fast"))),
                ),
            ),
            connected = listOf("anthropic", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertEquals(listOf("fast"), m.model.variants)

        edt { m.clearModelOverride() }
        flush()

        assertEquals("anthropic/claude", m.model.model)
        assertEquals(listOf("low", "high"), m.model.variants)
        assertEquals("high", m.model.variant)
    }

    fun `test selectAgent uses saved model for selected agent`() {
        appRpc.models = ModelStateDto(model = mapOf("plan" to ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY, config = ConfigDto(model = "qronos/gpt-5"))
        projectRpc.state.value = workspaceReady(
            agents = listOf(
                AgentDto(name = "code", displayName = "Code", mode = "code"),
                AgentDto(name = "plan", displayName = "Plan", mode = "code"),
            ),
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf("gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("qronos", "openai"),
            defaults = mapOf("code" to "qronos/gpt-5", "plan" to "qronos/gpt-5"),
        )
        val m = controller()
        collect(m)
        flush()

        edt { m.selectAgent("plan") }
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertTrue(m.model.modelOverride)
    }

    fun `test selectVariant stays in its session`() {
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "qronos",
                    name = "Qronos",
                    models = mapOf(
                        "gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5", variants = listOf("low", "medium", "high")),
                    ),
                ),
            ),
        )
        val first = controller()
        val second = controller()
        collect(first)
        collect(second)
        flush()

        edt { first.selectVariant("high") }
        flush()

        assertEquals("high", first.model.variant)
        assertEquals("low", second.model.variant)
        assertTrue(appRpc.variants.isEmpty())
    }
}
