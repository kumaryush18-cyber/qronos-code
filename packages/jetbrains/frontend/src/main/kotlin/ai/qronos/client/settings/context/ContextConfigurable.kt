package ai.qronos.client.settings.context

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.base.DraftReadyConfigurable
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class ContextConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = QronosBundle.message("settings.context.displayName")

    override fun create(cs: CoroutineScope): JComponent = ContextSettingsUi(cs)

    companion object {
        const val ID = "ai.qronos.jetbrains.settings.context"
    }
}
