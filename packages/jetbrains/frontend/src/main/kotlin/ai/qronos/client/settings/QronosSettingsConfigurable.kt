package ai.qronos.client.settings

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.agents.AgentBehaviorConfigurable
import ai.qronos.client.settings.autoapprove.AutoApproveConfigurable
import ai.qronos.client.settings.checkpoints.CheckpointsConfigurable
import ai.qronos.client.settings.context.ContextConfigurable
import ai.qronos.client.settings.integrations.IntegrationsConfigurable
import ai.qronos.client.settings.marketplace.MarketplaceConfigurable
import ai.qronos.client.settings.models.ModelsConfigurable
import ai.qronos.client.settings.providers.ProvidersConfigurable
import ai.qronos.client.settings.profile.UserProfileConfigurable
import ai.qronos.client.settings.transcript.TranscriptConfigurable
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.layout.Stack
import com.intellij.ide.DataManager
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.options.ex.Settings
import com.intellij.ui.components.ActionLink
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.JBUI
import javax.swing.JComponent

/**
 * Root settings entry under Settings -> Tools -> Qronos Code.
 *
 * Displays a brief description and links to the registered child pages.
 * Child configurables are registered in XML (`qronos.jetbrains.frontend.xml`) as
 * `applicationConfigurable` entries with the appropriate `parentId` — that is the
 * single source of truth for the settings hierarchy. This class does NOT implement
 * [com.intellij.openapi.options.SearchableConfigurable.Parent] to avoid creating a
 * second `UserProfileConfigurable` instance alongside the one registered in XML.
 *
 * The link uses [UserProfileConfigurable.ID] to navigate via [Settings.find]/[Settings.select].
 */
class QronosSettingsConfigurable : SearchableConfigurable {

    override fun getId(): String = ID

    override fun getDisplayName(): String = QronosBundle.message("settings.qronos.displayName")

    override fun createComponent(): JComponent {
        val panel = Stack.vertical()
        panel.border = JBUI.Borders.empty(UiStyle.Gap.lg(), 0, 0, 0)

        val desc = JBLabel(QronosBundle.message("settings.qronos.description"))
        desc.border = JBUI.Borders.emptyBottom(UiStyle.Gap.pad())
        panel.next(desc)

        val link = ActionLink(QronosBundle.message("settings.profile.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, UserProfileConfigurable.ID)
        }
        link.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(link)

        val models = ActionLink(QronosBundle.message("settings.models.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, ModelsConfigurable.ID)
        }
        models.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(models)

        val providers = ActionLink(QronosBundle.message("settings.providers.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, ProvidersConfigurable.ID)
        }
        providers.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(providers)

        val marketplace = ActionLink(QronosBundle.message("settings.marketplace.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, MarketplaceConfigurable.ID)
        }
        marketplace.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(marketplace)

        val behavior = ActionLink(QronosBundle.message("settings.agentBehavior.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, AgentBehaviorConfigurable.ID)
        }
        behavior.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(behavior)

        val autoApprove = ActionLink(QronosBundle.message("settings.autoApprove.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, AutoApproveConfigurable.ID)
        }
        autoApprove.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(autoApprove)

        val transcript = ActionLink(QronosBundle.message("settings.transcript.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, TranscriptConfigurable.ID)
        }
        transcript.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(transcript)

        val context = ActionLink(QronosBundle.message("settings.context.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, ContextConfigurable.ID)
        }
        context.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(context)

        val checkpoints = ActionLink(QronosBundle.message("settings.checkpoints.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, CheckpointsConfigurable.ID)
        }
        checkpoints.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(checkpoints)

        val integrations = ActionLink(QronosBundle.message("settings.integrations.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, IntegrationsConfigurable.ID)
        }
        integrations.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(integrations)

        val advanced = ActionLink(QronosBundle.message("settings.advanced.displayName")) { e ->
            val src = e.source as? JComponent ?: return@ActionLink
            val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
            open(settings, AdvancedConfigurable.ID)
        }
        advanced.border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm())
        panel.next(advanced)

        return panel
    }

    override fun isModified(): Boolean = false

    override fun apply() = Unit

    internal fun open(settings: Settings, id: String = UserProfileConfigurable.ID) {
        settings.find(id)?.let { settings.select(it) }
    }

    companion object {
        const val ID = "ai.qronos.jetbrains.settings"
    }
}
