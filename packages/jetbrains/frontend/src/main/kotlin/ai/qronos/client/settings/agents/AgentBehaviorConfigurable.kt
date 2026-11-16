package ai.qronos.client.settings.agents

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.base.DraftReadyConfigurable
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class AgentBehaviorConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = QronosBundle.message("settings.agentBehavior.displayName")

    override fun create(cs: CoroutineScope): JComponent = AgentBehaviorSettingsUi(cs)

    companion object {
        const val ID = "ai.qronos.jetbrains.settings.agentBehavior"
    }
}
