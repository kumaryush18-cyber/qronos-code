package ai.qronos.backend.rpc

import ai.qronos.backend.app.ConfigWarning
import ai.qronos.backend.app.LoadError
import ai.qronos.backend.workspace.AgentData
import ai.qronos.backend.workspace.AgentInfo
import ai.qronos.backend.workspace.CommandInfo
import ai.qronos.backend.workspace.QronosWorkspaceLoadProgress
import ai.qronos.backend.workspace.ModelInfo
import ai.qronos.backend.workspace.ProviderData
import ai.qronos.backend.workspace.ProviderInfo
import ai.qronos.backend.workspace.SkillInfo
import ai.qronos.rpc.dto.ModelAutoRoutingDto
import ai.qronos.rpc.dto.ModelCacheCostDto
import ai.qronos.rpc.dto.ModelCapabilitiesDto
import ai.qronos.rpc.dto.ModelCostDto
import ai.qronos.rpc.dto.AgentDto
import ai.qronos.rpc.dto.AgentsDto
import ai.qronos.rpc.dto.CommandDto
import ai.qronos.rpc.dto.ConfigWarningDto
import ai.qronos.rpc.dto.QronosWorkspaceLoadProgressDto
import ai.qronos.rpc.dto.LoadErrorDto
import ai.qronos.rpc.dto.ModelDto
import ai.qronos.rpc.dto.ModelInputCapabilitiesDto
import ai.qronos.rpc.dto.ModelLimitDto
import ai.qronos.rpc.dto.ModelOptionsDto
import ai.qronos.rpc.dto.ModelTerminalBenchDto
import ai.qronos.rpc.dto.ProviderDto
import ai.qronos.rpc.dto.ProvidersDto
import ai.qronos.rpc.dto.SkillDto

internal object QronosWorkspaceDtoMapper {
    fun error(e: LoadError) = LoadErrorDto(
        resource = e.resource,
        status = e.status,
        detail = e.detail,
    )

    fun progress(p: QronosWorkspaceLoadProgress) = QronosWorkspaceLoadProgressDto(
        providers = p.providers,
        agents = p.agents,
        commands = p.commands,
        skills = p.skills,
    )

    fun providers(d: ProviderData) = ProvidersDto(
        providers = d.providers.map(::provider),
        connected = d.connected,
        defaults = d.defaults,
    )

    fun agents(d: AgentData) = AgentsDto(
        agents = d.agents.map(::agent),
        all = d.all.map(::agent),
        default = d.default,
    )

    fun command(c: CommandInfo) = CommandDto(
        name = c.name,
        description = c.description,
        agent = c.agent,
        model = c.model,
        variant = c.variant,
        source = c.source,
        hints = c.hints,
        subtask = c.subtask,
    )

    fun skill(s: SkillInfo) = SkillDto(
        name = s.name,
        description = s.description,
        location = s.location,
        content = s.content,
        editable = false,
    )

    fun warning(w: ConfigWarning) = ConfigWarningDto(
        path = w.path,
        message = w.message,
        detail = w.detail,
    )

    private fun provider(p: ProviderInfo) = ProviderDto(
        id = p.id,
        name = p.name,
        source = p.source,
        models = p.models.mapValues { (_, m) -> model(m) },
    )

    private fun model(m: ModelInfo) = ModelDto(
        id = m.id,
        name = m.name,
        inputPrice = m.inputPrice,
        outputPrice = m.outputPrice,
        contextLength = m.contextLength,
        releaseDate = m.releaseDate,
        latest = m.latest,
        attachment = m.attachment,
        reasoning = m.reasoning,
        temperature = m.temperature,
        toolCall = m.toolCall,
        free = m.free,
        byok = m.byok,
        status = m.status,
        recommendedIndex = m.recommendedIndex,
        variants = m.variants,
        limit = m.limit?.let { ModelLimitDto(it.context, it.input, it.output) },
        cost = m.cost?.let { cost ->
            ModelCostDto(
                input = cost.input,
                output = cost.output,
                cache = cost.cache?.let { ModelCacheCostDto(it.read, it.write) },
            )
        },
        capabilities = m.capabilities?.let { cap ->
            ModelCapabilitiesDto(
                reasoning = cap.reasoning,
                input = cap.input?.let { ModelInputCapabilitiesDto(it.text, it.image, it.audio, it.video, it.pdf) },
            )
        },
        options = m.options?.let { ModelOptionsDto(it.description) },
        autoRouting = m.autoRouting?.let { ModelAutoRoutingDto(it.models) },
        terminalBench = m.terminalBench?.let { ModelTerminalBenchDto(it.overallScore, it.avgAttemptCostUsd) },
        mayTrainOnYourPrompts = m.mayTrainOnYourPrompts,
    )

    private fun agent(a: AgentInfo) = AgentDto(
        name = a.name,
        displayName = a.displayName,
        description = a.description,
        mode = a.mode,
        native = a.native,
        hidden = a.hidden,
        color = a.color,
        deprecated = a.deprecated,
    )
}
