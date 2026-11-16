package ai.qronos.client.settings.integrations

import ai.qronos.client.agentManager.worktree.GithubIntegrationListener
import ai.qronos.client.agentManager.worktree.setGithubIntegration
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.plugin.QronosPluginSettings
import ai.qronos.client.settings.base.BaseContentPanel
import ai.qronos.client.settings.base.SettingsPanel
import ai.qronos.client.settings.base.SettingsRow
import ai.qronos.client.settings.base.SettingsToggle
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.util.concurrency.annotations.RequiresEdt

/**
 * Integrations page. Every setting here is a local IDE preference, so the page renders immediately
 * and writes on toggle instead of going through [ai.qronos.client.settings.base.BaseSettingsUi]'s
 * draft/apply flow, which would gate the UI on CLI readiness it does not need.
 */
internal class IntegrationsSettingsUi : SettingsPanel(), Disposable {
    private val github = SettingsToggle(QronosPluginSettings.getGithub()) { setGithubIntegration(it, "settings") }

    init {
        val content = BaseContentPanel()
        content.section(
            QronosBundle.message("settings.integrations.github.title"),
            QronosBundle.message("settings.integrations.github.description"),
        ).row(
            SettingsRow(
                QronosBundle.message("settings.integrations.github.enabled.title"),
                QronosBundle.message("settings.integrations.github.enabled.description"),
                github,
            ),
        )
        setContent(content)
        // The gh banner can turn the integration off while this page is open.
        ApplicationManager.getApplication().messageBus.connect(this)
            .subscribe(GithubIntegrationListener.TOPIC, GithubIntegrationListener { sync() })
    }

    @RequiresEdt
    fun sync() {
        val value = QronosPluginSettings.getGithub()
        if (github.isSelected != value) github.isSelected = value
    }

    override fun dispose() = Unit
}
