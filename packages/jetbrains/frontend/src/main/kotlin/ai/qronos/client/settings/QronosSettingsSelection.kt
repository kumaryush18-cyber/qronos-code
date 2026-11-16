package ai.qronos.client.settings

import ai.qronos.client.settings.profile.UserProfileConfigurable
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.project.Project

internal object QronosSettingsSelection {
    // IntelliJ persists the selected settings page with SettingsEditor.SELECTED_CONFIGURABLE.
    const val SELECTED_CONFIGURABLE_KEY = "settings.editor.selected.configurable"

    fun target(project: Project): String {
        val id = PropertiesComponent.getInstance(project).getValue(SELECTED_CONFIGURABLE_KEY)
        if (id != null && isQronos(id)) return id
        return UserProfileConfigurable.ID
    }

    private fun isQronos(id: String?): Boolean {
        if (id == QronosSettingsConfigurable.ID) return true
        return id?.startsWith("${QronosSettingsConfigurable.ID}.") == true
    }
}
