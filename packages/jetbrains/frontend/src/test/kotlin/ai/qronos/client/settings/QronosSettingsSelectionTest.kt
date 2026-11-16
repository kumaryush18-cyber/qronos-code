package ai.qronos.client.settings

import ai.qronos.client.settings.models.ModelsConfigurable
import ai.qronos.client.settings.profile.UserProfileConfigurable
import com.intellij.ide.util.PropertiesComponent
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class QronosSettingsSelectionTest : BasePlatformTestCase() {

    override fun tearDown() {
        try {
            PropertiesComponent.getInstance(project).unsetValue(QronosSettingsSelection.SELECTED_CONFIGURABLE_KEY)
        } finally {
            super.tearDown()
        }
    }

    fun `test falls back to profile when no last settings page exists`() {
        assertEquals(UserProfileConfigurable.ID, QronosSettingsSelection.target(project))
    }

    fun `test falls back to profile when last page is not qronos`() {
        select("preferences.lookFeel")

        assertEquals(UserProfileConfigurable.ID, QronosSettingsSelection.target(project))
    }

    fun `test keeps last qronos root page`() {
        select(QronosSettingsConfigurable.ID)

        assertEquals(QronosSettingsConfigurable.ID, QronosSettingsSelection.target(project))
    }

    fun `test keeps last qronos child page`() {
        select(ModelsConfigurable.ID)

        assertEquals(ModelsConfigurable.ID, QronosSettingsSelection.target(project))
    }

    private fun select(id: String) {
        PropertiesComponent.getInstance(project).setValue(QronosSettingsSelection.SELECTED_CONFIGURABLE_KEY, id)
    }
}
