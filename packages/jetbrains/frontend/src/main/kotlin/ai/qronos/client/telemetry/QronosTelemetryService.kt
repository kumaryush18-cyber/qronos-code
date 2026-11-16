@file:Suppress("UnstableApiUsage")

package ai.qronos.client.telemetry

import ai.qronos.log.QronosLog
import ai.qronos.rpc.QronosAppRpcApi
import ai.qronos.rpc.dto.TelemetryCaptureDto
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.serviceOrNull
import fleet.rpc.client.durable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

object Telemetry {
    fun send(event: String, properties: Map<String, String> = emptyMap()) {
        QronosTelemetryService.getInstance()?.send(event, properties)
    }
}

@Service(Service.Level.APP)
class QronosTelemetryService internal constructor(
    private val cs: CoroutineScope,
    private val rpc: QronosAppRpcApi?,
) {
    constructor(cs: CoroutineScope) : this(cs, null)

    companion object {
        private val LOG = QronosLog.create(QronosTelemetryService::class.java)
        private const val MAX_PENDING = 64
        private const val TIMEOUT_MS = 5_000L

        fun getInstance(): QronosTelemetryService? = serviceOrNull()
    }

    private val pending = AtomicInteger()
    private val warned = AtomicBoolean()

    fun send(event: String, properties: Map<String, String> = emptyMap()) {
        if (pending.incrementAndGet() > MAX_PENDING) {
            pending.decrementAndGet()
            if (warned.compareAndSet(false, true)) {
                LOG.warn("telemetry backpressure: dropping events with more than $MAX_PENDING pending")
            }
            return
        }
        cs.launch {
            try {
                if (QronosLog.sandbox()) {
                    val payload = QronosLog.payload(LOG) + properties
                    LOG.info("event=$event ${payload.entries.joinToString(" ") { "${it.key}=${it.value}" }}")
                    return@launch
                }
                val dto = TelemetryCaptureDto(event, properties)
                val sent = withTimeoutOrNull(TIMEOUT_MS) {
                    val api = rpc
                    if (api != null) api.captureTelemetry(dto)
                    else durable { QronosAppRpcApi.getInstance().captureTelemetry(dto) }
                    true
                }
                if (sent != true) LOG.warn("telemetry capture timed out: $event")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                LOG.warn("telemetry capture failed: ${e.message}", e)
            } finally {
                pending.decrementAndGet()
            }
        }
    }
}
