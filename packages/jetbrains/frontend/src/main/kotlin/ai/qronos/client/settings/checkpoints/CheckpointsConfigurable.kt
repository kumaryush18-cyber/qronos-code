package ai.qronos.client.settings.checkpoints

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.base.DraftReadyConfigurable
import com.intellij.platform.project.projectIdOrNull
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class CheckpointsConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = QronosBundle.message("settings.checkpoints.displayName")

    override fun create(cs: CoroutineScope): JComponent = CheckpointsSettingsUi(
        cs,
        hint = project?.basePath,
        projectId = project?.projectIdOrNull(),
    )

    companion object {
        const val ID = "ai.qronos.jetbrains.settings.checkpoints"
    }
}
