package ai.qronos.backend.app

import ai.qronos.jetbrains.api.model.QronosNotifications200ResponseInner
import ai.qronos.jetbrains.api.model.QronosProfile200Response
import ai.qronos.backend.migration.LegacyMigrationDetection
import ai.qronos.rpc.dto.ConfigDto

/**
 * Full application lifecycle state, combining CLI transport connection
 * status with data-loading progress.
 *
 * [ConnectionState] stays internal to [QronosConnectionService] for the
 * transport layer. This sealed class is what the frontend observes.
 */
sealed class QronosAppState {
    data object Disconnected : QronosAppState()
    data class Downloading(val percent: Int, val version: String, val platform: String) : QronosAppState()
    data object Connecting : QronosAppState()
    data class Loading(val progress: LoadProgress) : QronosAppState()
    data class MigrationRequired(val detection: LegacyMigrationDetection) : QronosAppState()
    data class Ready(val data: AppData, val rev: Long = 0) : QronosAppState()
    data class Error(val message: String, val errors: List<LoadError> = emptyList()) : QronosAppState()
}

/**
 * Tracks which global data fetches have completed during the [QronosAppState.Loading] phase.
 */
data class LoadProgress(
    val config: Boolean = false,
    val notifications: Boolean = false,
    val profile: ProfileResult = ProfileResult.PENDING,
)

/** Outcome of the profile fetch. */
enum class ProfileResult { PENDING, LOADED, NOT_LOGGED_IN }

/**
 * Error detail for a single resource that failed to load.
 */
data class LoadError(
    val resource: String,
    val status: Int? = null,
    val detail: String? = null,
)

data class ConfigWarning(
    val path: String,
    val message: String,
    val detail: String? = null,
)

/**
 * All global data that has been successfully loaded.
 * Present only in [QronosAppState.Ready].
 */
data class AppData(
    val profile: QronosProfile200Response?,
    val config: ConfigDto,
    val notifications: List<QronosNotifications200ResponseInner>,
)
