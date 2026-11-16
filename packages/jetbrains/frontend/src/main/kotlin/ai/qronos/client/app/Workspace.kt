package ai.qronos.client.app

import ai.qronos.rpc.dto.QronosWorkspaceStateDto
import kotlinx.coroutines.flow.StateFlow

/**
 * A workspace for a single directory. Mirrors the CLI concept of a
 * workspace — a directory with its providers, agents, commands, skills.
 *
 * Immutable reference — [state] flows internally as the workspace loads.
 * Lifecycle managed by [QronosWorkspaceService].
 */
class Workspace(
    val directory: String,
    val state: StateFlow<QronosWorkspaceStateDto>,
    val reload: () -> Unit,
    val refreshConfigFiles: () -> Unit = {},
)
