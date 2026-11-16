package ai.qronos.backend.app

import ai.qronos.jetbrains.api.model.QronosRetentionRun200Response
import ai.qronos.jetbrains.api.model.QronosRetentionRunRequest
import ai.qronos.jetbrains.api.model.QronosRetentionStatus200Response
import ai.qronos.rpc.dto.RetentionPolicyDto
import ai.qronos.rpc.dto.RetentionProgressDto
import ai.qronos.rpc.dto.RetentionResultDto
import ai.qronos.rpc.dto.RetentionStatusDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

class QronosBackendRetentionManager(private val app: QronosBackendAppService) {
    suspend fun status(): RetentionStatusDto {
        app.requireReady()
        val api = app.api ?: throw IllegalStateException("Qronos API client is unavailable")
        return withContext(Dispatchers.IO) { api.qronosRetentionStatus(null, null) }.dto()
    }

    suspend fun run(force: Boolean): RetentionStatusDto {
        app.requireReady()
        val api = app.api ?: throw IllegalStateException("Qronos API client is unavailable")
        return withContext(Dispatchers.IO) {
            api.qronosRetentionRun(null, null, QronosRetentionRunRequest(force))
        }.dto()
    }
}

private fun QronosRetentionStatus200Response.dto() = RetentionStatusDto(
    policy = RetentionPolicyDto(policy.enabled, policy.maxAgeDays.int(30)),
    last = last?.let { RetentionResultDto(
        at = it.at.long(), scanned = it.scanned.int(), deleted = it.deleted.int(),
        skippedActive = it.skippedActive.int(), failed = it.failed.int(), durationMs = it.durationMs.long(),
    ) },
    progress = progress?.let { RetentionProgressDto(
        phase = it.phase.value, total = it.total.toInt(), processed = it.processed.toInt(),
        deleted = it.deleted.toInt(), failed = it.failed.toInt(), skippedActive = it.skippedActive.toInt(),
    ) },
)

private fun QronosRetentionRun200Response.dto() = RetentionStatusDto(
    policy = RetentionPolicyDto(policy.enabled, policy.maxAgeDays.int(30)),
    last = last?.let { RetentionResultDto(
        at = it.at.long(), scanned = it.scanned.int(), deleted = it.deleted.int(),
        skippedActive = it.skippedActive.int(), failed = it.failed.int(), durationMs = it.durationMs.long(),
    ) },
    progress = progress?.let { RetentionProgressDto(
        phase = it.phase.value, total = it.total.toInt(), processed = it.processed.toInt(),
        deleted = it.deleted.toInt(), failed = it.failed.toInt(), skippedActive = it.skippedActive.toInt(),
    ) },
)

private fun JsonElement.long(fallback: Long = 0): Long = jsonPrimitive.longOrNull ?: fallback
private fun JsonElement.int(fallback: Int = 0): Int =
    jsonPrimitive.longOrNull?.takeIf { it in Int.MIN_VALUE..Int.MAX_VALUE }?.toInt() ?: fallback
