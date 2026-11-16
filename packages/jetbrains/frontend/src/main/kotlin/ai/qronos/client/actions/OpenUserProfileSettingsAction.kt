package ai.qronos.client.actions

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.profile.UserProfileConfigurable
import com.intellij.openapi.actionSystem.AnActionEvent

class OpenUserProfileSettingsAction : OpenSettingsPageAction(
    QronosBundle.message("action.Qronos.OpenUserProfileSettings.text"),
    QronosBundle.message("action.Qronos.OpenUserProfileSettings.description"),
    surface = "tool_window_profile",
) {
    internal override fun page(e: AnActionEvent): String = UserProfileConfigurable.ID
}
