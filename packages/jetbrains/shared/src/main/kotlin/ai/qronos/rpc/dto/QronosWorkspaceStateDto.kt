package ai.qronos.rpc.dto

import kotlinx.serialization.Serializable

@Serializable
enum class QronosWorkspaceStatusDto {
    PENDING,
    LOADING,
    READY,
    UNSUPPORTED,
    MISSING,
    ERROR,
}

@Serializable
data class QronosWorkspaceLoadProgressDto(
    val providers: Boolean = false,
    val agents: Boolean = false,
    val commands: Boolean = false,
    val skills: Boolean = false,
)

@Serializable
data class QronosWorkspaceStateDto(
    val status: QronosWorkspaceStatusDto,
    val progress: QronosWorkspaceLoadProgressDto? = null,
    val providers: ProvidersDto? = null,
    val agents: AgentsDto? = null,
    val commands: List<CommandDto> = emptyList(),
    val skills: List<SkillDto> = emptyList(),
    val error: String? = null,
    val errors: List<LoadErrorDto> = emptyList(),
    val warnings: List<ConfigWarningDto> = emptyList(),
)

@Serializable
data class ModelsWorkspaceDto(
    val providers: ProvidersDto? = null,
    val agents: AgentsDto? = null,
    val errors: List<LoadErrorDto> = emptyList(),
)
