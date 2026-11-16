package ai.qronos.client.actions

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.QronosSettingsSelection
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.ProjectManager

class OpenSettingsAction : OpenSettingsPageAction(
    QronosBundle.message("action.Qronos.OpenSettings.text"),
    QronosBundle.message("action.Qronos.OpenSettings.description"),
    surface = "tool_window",
) {
    /** Reopens wherever the user last was, so this entry resumes rather than jumps somewhere fixed. */
    internal override fun page(e: AnActionEvent): String =
        QronosSettingsSelection.target(e.project ?: ProjectManager.getInstance().defaultProject)
}
