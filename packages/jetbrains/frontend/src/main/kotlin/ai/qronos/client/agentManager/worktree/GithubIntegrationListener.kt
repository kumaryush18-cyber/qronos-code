package ai.qronos.client.agentManager.worktree

import ai.qronos.client.plugin.QronosPluginSettings
import ai.qronos.client.telemetry.Telemetry
import com.intellij.openapi.application.ApplicationManager
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.messages.Topic

fun interface GithubIntegrationListener {
    fun changed(enabled: Boolean)

    companion object {
        @JvmField
        val TOPIC: Topic<GithubIntegrationListener> = Topic.create(
            "Qronos github integration",
            GithubIntegrationListener::class.java,
        )
    }
}

/**
 * Single write path for the GitHub integration toggle: persists the value, records telemetry, and
 * publishes [GithubIntegrationListener.TOPIC] so [GhStatusCoordinator], [WorktreeStatusService], the
 * chat branch dock, and any open settings page stay in sync.
 */
@RequiresEdt
internal fun setGithubIntegration(enabled: Boolean, surface: String) {
    if (QronosPluginSettings.getGithub() == enabled) return
    QronosPluginSettings.setGithub(enabled)
    Telemetry.send("Github Integration Toggled", mapOf("enabled" to enabled.toString(), "surface" to surface))
    ApplicationManager.getApplication().messageBus
        .syncPublisher(GithubIntegrationListener.TOPIC)
        .changed(enabled)
}
