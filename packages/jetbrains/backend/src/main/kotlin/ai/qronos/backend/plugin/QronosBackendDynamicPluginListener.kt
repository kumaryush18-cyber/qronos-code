package ai.qronos.backend.plugin

import ai.qronos.QronosPlugin
import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.log.QronosLog
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.openapi.components.service

class QronosBackendDynamicPluginListener : DynamicPluginListener {
    private val log = QronosLog.create(QronosBackendDynamicPluginListener::class.java)

    override fun beforePluginUnload(pluginDescriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        if (pluginDescriptor.pluginId != QronosPlugin.id) return
        log.info("Shutting down Qronos backend for plugin unload (isUpdate=$isUpdate)")
        service<QronosBackendAppService>().shutdownForUnload()
    }
}
