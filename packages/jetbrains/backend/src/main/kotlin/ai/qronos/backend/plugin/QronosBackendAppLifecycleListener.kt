package ai.qronos.backend.plugin

import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.log.QronosLog
import com.intellij.ide.AppLifecycleListener
import com.intellij.openapi.components.serviceIfCreated

class QronosBackendAppLifecycleListener : AppLifecycleListener {
    private val log = QronosLog.create(QronosBackendAppLifecycleListener::class.java)

    override fun appWillBeClosed(isRestart: Boolean) {
        log.info("appWillBeClosed(isRestart=$isRestart) — stopping Qronos CLI")
        runCatching {
            serviceIfCreated<QronosBackendAppService>()?.shutdownForAppClose()
        }.onFailure { log.warn("Failed to stop CLI on app close", it) }
    }
}
