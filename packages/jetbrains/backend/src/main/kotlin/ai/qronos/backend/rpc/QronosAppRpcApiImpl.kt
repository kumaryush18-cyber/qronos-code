@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.backend.app.QronosAppState
import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.backend.telemetry.QronosBackendTelemetry
import ai.qronos.backend.app.LoadError
import ai.qronos.backend.app.LoadProgress
import ai.qronos.backend.app.ProfileResult
import ai.qronos.backend.cli.QronosCliPlatform
import ai.qronos.backend.cli.QronosProps
import ai.qronos.backend.cli.QronosRepoCli
import ai.qronos.backend.workspace.QronosWorktreeIndexSettings
import ai.qronos.jetbrains.api.model.QronosProfile200Response
import ai.qronos.log.QronosLog
import ai.qronos.log.LogConfig
import ai.qronos.rpc.dto.ConfigPatchDto
import ai.qronos.rpc.QronosAppRpcApi
import ai.qronos.rpc.dto.DeviceAuthDto
import ai.qronos.rpc.dto.HealthDto
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import ai.qronos.rpc.dto.LoadErrorDto
import ai.qronos.rpc.dto.LoadProgressDto
import ai.qronos.rpc.dto.LogConfigDto
import ai.qronos.rpc.dto.LogFileDto
import ai.qronos.rpc.dto.ModelFavoriteUpdateDto
import ai.qronos.rpc.dto.ModelSelectionUpdateDto
import ai.qronos.rpc.dto.ModelStateDto
import ai.qronos.rpc.dto.ModelVariantUpdateDto
import ai.qronos.rpc.dto.ProfileBalanceDto
import ai.qronos.rpc.dto.ProfileDto
import ai.qronos.rpc.dto.ProfileQronosPassDto
import ai.qronos.rpc.dto.ProfileOrganizationDto
import ai.qronos.rpc.dto.ProfileStatusDto
import ai.qronos.rpc.dto.RetentionStatusDto
import ai.qronos.rpc.dto.SpeechModelDto
import ai.qronos.rpc.dto.SpeechRequestDto
import ai.qronos.rpc.dto.SpeechResultDto
import ai.qronos.rpc.dto.TelemetryCaptureDto
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.writeAction
import com.intellij.openapi.components.service
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.project.RootsChangeRescanningInfo
import com.intellij.openapi.roots.ex.ProjectRootManagerEx
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.nio.file.Files
import java.util.Base64
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Backend implementation of [QronosAppRpcApi].
 *
 * Delegates directly to the app-level [QronosBackendAppService] —
 * no project resolution needed since all operations are app-scoped.
 */
class QronosAppRpcApiImpl internal constructor(
    private val svc: QronosBackendAppService? = null,
) : QronosAppRpcApi {

    private var speechTimeout = DEFAULT_SPEECH_TIMEOUT_SECONDS

    internal constructor(svc: QronosBackendAppService?, speechTimeout: Long) : this(svc) {
        this.speechTimeout = speechTimeout
    }

    companion object {
        private const val DEFAULT_SPEECH_TIMEOUT_SECONDS = 120L
        private const val MODEL_TIMEOUT_SECONDS = 30L
        private const val ERROR_BODY_LIMIT = 1000
        private val JSON = Json { ignoreUnknownKeys = true }
        private val JSON_TYPE = "application/json".toMediaType()
    }

    @Serializable
    private data class SpeechModelWire(
        val id: String,
        val name: String,
    )

    @Serializable
    private data class SpeechResultWire(
        val text: String,
    )

    private val app: QronosBackendAppService get() = svc ?: service()

    override suspend fun connect() = app.connect()

    override suspend fun state(): Flow<QronosAppStateDto> =
        combine(app.appState, app.capabilities) { state, caps -> appStateDto(state, caps) }
            .distinctUntilChanged()

    override suspend fun health(): HealthDto = app.health()

    override suspend fun cliVersion(): String = QronosProps.cliVersion()

    override suspend fun cliPlatform(): String = QronosCliPlatform.current()

    override suspend fun cliBundled(): Boolean = QronosRepoCli.available()

    override suspend fun retry() = app.retry()

    override suspend fun restart() = app.restart()

    override suspend fun reinstall() = app.reinstall()

    override suspend fun modelState(): ModelStateDto {
        app.requireReady()
        return app.models.state()
    }

    override suspend fun updateModelFavorite(update: ModelFavoriteUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.favorite(update)
    }

    override suspend fun updateModelSelection(update: ModelSelectionUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.selection(update)
    }

    override suspend fun clearModelSelection(agent: String): ModelStateDto {
        app.requireReady()
        return app.models.clear(agent)
    }

    override suspend fun updateModelVariant(update: ModelVariantUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.variant(update)
    }

    override suspend fun updateConfig(patch: ConfigPatchDto): QronosAppStateDto {
        app.requireReady()
        return appStateDto(app.updateConfig(patch), app.capabilities.value)
    }

    override suspend fun retentionStatus(): RetentionStatusDto = app.retention.status()

    override suspend fun runRetention(force: Boolean): RetentionStatusDto = app.retention.run(force)

    override suspend fun applyLogConfig(config: LogConfigDto) {
        LogConfig.apply(config.level, config.contentMode, config.previewMax)
    }

    override suspend fun indexWorktrees(): Boolean = QronosWorktreeIndexSettings.get()

    override suspend fun setIndexWorktrees(value: Boolean) {
        if (QronosWorktreeIndexSettings.get() == value) return
        QronosWorktreeIndexSettings.set(value)
        if (ApplicationManager.getApplication() == null) return
        for (project in ProjectManager.getInstance().openProjects) {
            if (project.isDisposed) continue
            writeAction {
                ProjectRootManagerEx.getInstanceEx(project)
                    .makeRootsChange({}, RootsChangeRescanningInfo.RESCAN_DEPENDENCIES_IF_NEEDED)
            }
        }
    }

    override suspend fun backendLogFile(): LogFileDto? = withContext(Dispatchers.IO) {
        val path = QronosLog.logFile()
        if (!Files.exists(path)) return@withContext null
        LogFileDto(path.fileName.toString(), Files.readString(path))
    }

    override suspend fun refreshProfile(): ProfileDto? = app.refreshProfile()?.let(::profileDto)

    override suspend fun transcriptionModels(directory: String?): List<SpeechModelDto> {
        app.requireReady()
        val body = request("qronos/models/transcriptions", directory, null, MODEL_TIMEOUT_SECONDS)
        return JSON.decodeFromString<List<SpeechModelWire>>(body).map { model ->
            SpeechModelDto(model.id, model.name)
        }
    }

    override suspend fun transcribe(directory: String?, request: SpeechRequestDto): SpeechResultDto {
        app.requireReady()
        val payload = buildJsonObject {
            put("model", request.model)
            putJsonObject("input_audio") {
                put("data", Base64.getEncoder().encodeToString(request.data))
                put("format", request.format)
            }
            request.prompt?.let { put("prompt", it) }
        }
        val body = this.request("qronos/audio/transcriptions", directory, payload.toString(), speechTimeout)
        return SpeechResultDto(JSON.decodeFromString<SpeechResultWire>(body).text)
    }

    private suspend fun request(path: String, directory: String?, body: String?, timeout: Long): String {
        val http = app.http ?: error("Qronos Core is not connected")
        val url = "http://127.0.0.1:${app.port}".toHttpUrl().newBuilder()
            .addPathSegments(path)
            .apply { directory?.let { addQueryParameter("directory", it) } }
            .build()
        val builder = Request.Builder().url(url)
        if (body == null) builder.get() else builder.post(body.toRequestBody(JSON_TYPE))
        val call = http.newCall(builder.build())
        call.timeout().timeout(timeout, TimeUnit.SECONDS)
        return call.await().use { response ->
            if (!response.isSuccessful) {
                val content = response.peekBody(ERROR_BODY_LIMIT.toLong()).string()
                throw IOException("Qronos Core request failed (${response.code}): $content")
            }
            response.body.string()
        }
    }

    private suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
        continuation.invokeOnCancellation { cancel() }
        enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (!continuation.isCancelled) continuation.resumeWithException(e)
            }

            override fun onResponse(call: Call, response: Response) {
                continuation.resume(response) { _, value, _ -> value.close() }
            }
        })
    }

    override suspend fun startLogin(directory: String?): DeviceAuthDto = app.startLogin(directory)

    override suspend fun completeLogin(directory: String?): ProfileDto? =
        app.completeLogin(directory)?.let(::profileDto)

    override suspend fun logout(): Boolean = app.logout()

    override suspend fun setOrganization(organizationId: String?): ProfileDto? =
        app.setOrganization(organizationId)?.let(::profileDto)

    override suspend fun captureTelemetry(capture: TelemetryCaptureDto) {
        service<QronosBackendTelemetry>().capture(app.http, app.port, capture.event, capture.properties)
    }

}

internal fun appStateDto(state: QronosAppState, backgroundSubagents: Boolean = false): QronosAppStateDto =
    when (state) {
        QronosAppState.Disconnected -> QronosAppStateDto(QronosAppStatusDto.DISCONNECTED)
        is QronosAppState.Downloading -> QronosAppStateDto(
            status = QronosAppStatusDto.DOWNLOADING,
            downloadPercent = state.percent,
            downloadVersion = state.version,
            downloadPlatform = state.platform,
        )
        QronosAppState.Connecting -> QronosAppStateDto(QronosAppStatusDto.CONNECTING)
        is QronosAppState.Loading -> QronosAppStateDto(
            status = QronosAppStatusDto.LOADING,
            progress = progress(state.progress),
        )
        is QronosAppState.MigrationRequired -> QronosAppStateDto(
            status = QronosAppStatusDto.MIGRATION_REQUIRED,
            migration = MigrationRpcMapper.toDto(state.detection),
        )
        is QronosAppState.Ready -> QronosAppStateDto(
            status = QronosAppStatusDto.READY,
            progress = LoadProgressDto(
                config = true,
                notifications = true,
                profile = if (state.data.profile != null) ProfileStatusDto.LOADED
                    else ProfileStatusDto.NOT_LOGGED_IN,
            ),
            config = state.data.config,
            profile = state.data.profile?.let(::profileDto),
            backgroundSubagents = backgroundSubagents,
        )
        is QronosAppState.Error -> QronosAppStateDto(
            status = QronosAppStatusDto.ERROR,
            error = state.message,
            errors = state.errors.map(::error),
        )
    }

internal fun profileDto(p: QronosProfile200Response): ProfileDto = ProfileDto(
    email = p.profile.email,
    name = p.profile.name,
    organizations = p.profile.organizations.orEmpty().map { org ->
        ProfileOrganizationDto(id = org.id, name = org.name, role = org.role)
    },
    // The pinned CLI release does not expose hasPersonalAccount yet, so default to
    // showing the personal account. Flip back to p.profile.hasPersonalAccount once a
    // CLI release ships the field.
    hasPersonalAccount = true,
    balance = p.balance?.balance?.let { ProfileBalanceDto(balance = it) },
    qronosPass = p.qronosPass?.let {
        val base = it.currentPeriodBaseCreditsUsd ?: return@let null
        val usage = it.currentPeriodUsageUsd ?: return@let null
        val bonus = it.currentPeriodBonusCreditsUsd ?: return@let null
        ProfileQronosPassDto(
            currentPeriodBaseCreditsUsd = base,
            currentPeriodUsageUsd = usage,
            currentPeriodBonusCreditsUsd = bonus,
            nextBillingAt = it.nextBillingAt,
        )
    },
    currentOrgId = p.currentOrgId,
)

private fun progress(p: LoadProgress) = LoadProgressDto(
    config = p.config,
    notifications = p.notifications,
    profile = when (p.profile) {
        ProfileResult.PENDING -> ProfileStatusDto.PENDING
        ProfileResult.LOADED -> ProfileStatusDto.LOADED
        ProfileResult.NOT_LOGGED_IN -> ProfileStatusDto.NOT_LOGGED_IN
    },
)

private fun error(e: LoadError) = LoadErrorDto(
    resource = e.resource,
    status = e.status,
    detail = e.detail,
)
