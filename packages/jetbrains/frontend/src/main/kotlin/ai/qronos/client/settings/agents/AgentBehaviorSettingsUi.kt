package ai.qronos.client.settings.agents

import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.settings.base.BaseContentPanel
import ai.qronos.client.settings.base.BaseSettingsUi
import ai.qronos.client.settings.base.SettingsRow
import ai.qronos.client.settings.base.SettingsToggle
import ai.qronos.client.settings.rules.RulesConfigurable
import ai.qronos.client.ui.UiStyle
import ai.qronos.log.QronosLog
import ai.qronos.rpc.dto.ConfigPatchDto
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import com.intellij.ide.DataManager
import com.intellij.openapi.components.service
import com.intellij.openapi.options.ex.Settings
import com.intellij.ui.TitledSeparator
import com.intellij.ui.components.ActionLink
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

/**
 * Agent Behavior root page: the Qronos Swarm toggle plus links to the sub-pages. Mirrors VS Code's
 * Agent Behaviour tab, which hosts the same `shared_agent_board` switch.
 */
internal class AgentBehaviorSettingsUi(
    cs: CoroutineScope,
    private val app: QronosAppService = service(),
    workspaces: QronosWorkspaceService = service(),
) : BaseSettingsUi<AgentBehaviorContent, AgentBehaviorDraft, ConfigPatchDto, QronosAppStateDto, Unit>(
    cs,
    AgentBehaviorDraft(),
    app,
    workspaces,
    loginBanner = false,
) {
    init {
        startSettings(AgentBehaviorContent { updateDraft(it) })
    }

    override fun change(from: AgentBehaviorDraft, to: AgentBehaviorDraft): ConfigPatchDto? = patch(from, to)

    override fun save(change: ConfigPatchDto, done: (QronosAppStateDto?) -> Unit) {
        app.updateConfigAsync(change, done)
    }

    override fun base(result: QronosAppStateDto): AgentBehaviorDraft = agentBehaviorDraft(result.config)

    override fun draft(state: QronosAppStateDto): AgentBehaviorDraft = agentBehaviorDraft(state.config)

    override fun saved(base: AgentBehaviorDraft, draft: AgentBehaviorDraft): Boolean = savedMatches(base, draft)

    override fun pendingText(): String = QronosBundle.message("settings.agentBehavior.saving")

    override fun failedText(): String = QronosBundle.message("settings.agentBehavior.save.failed")

    override suspend fun loadWorkspace(root: String) = Unit

    override fun applyWorkspace(result: Unit) = Unit

    override fun logSaveStarted(change: ConfigPatchDto) = LOG.info("agent behavior settings save: started")

    override fun logSaveCompleted(change: ConfigPatchDto) = LOG.info("agent behavior settings save: completed")

    override fun logSaveFailed(change: ConfigPatchDto) = LOG.warn("agent behavior settings save: failed")

    override fun logSaveFailedAfterDispose(change: ConfigPatchDto) =
        LOG.warn("agent behavior settings save: failed after dispose")

    override fun logSaveCompletedAfterDispose(change: ConfigPatchDto) =
        LOG.info("agent behavior settings save: completed after dispose")

    @RequiresEdt
    override fun syncContent() {
        val ready = appState.status == QronosAppStatusDto.READY
        form.sync(draft, ready && !saving)
        top.hideBanner()
        if (saving) {
            showProgress(QronosBundle.message("settings.agentBehavior.saving"))
            return
        }
        val err = saveError
        if (err != null) {
            showError(err)
            return
        }
        if (!ready) {
            showProgress(QronosBundle.message("settings.cli.unavailable.message"))
            return
        }
        clearProgress()
    }

    private companion object {
        val LOG = QronosLog.create(AgentBehaviorSettingsUi::class.java)
    }
}

internal class AgentBehaviorContent(
    private val update: (AgentBehaviorDraft.() -> AgentBehaviorDraft) -> Unit,
) : BaseContentPanel() {
    private val swarm = SettingsToggle { value -> update { copy(swarm = value) } }

    init {
        val rows = section(
            QronosBundle.message("settings.agentBehavior.displayName"),
            QronosBundle.message("settings.agentBehavior.description"),
        )
        listOf(
            QronosBundle.message("settings.agentBehavior.agents.displayName") to AgentsConfigurable.ID,
            QronosBundle.message("settings.agentBehavior.mcp.displayName") to McpConfigurable.ID,
            QronosBundle.message("settings.agentBehavior.skills.displayName") to SkillsConfigurable.ID,
            QronosBundle.message("settings.agentBehavior.commands.displayName") to CommandsConfigurable.ID,
            QronosBundle.message("settings.agentBehavior.rules.displayName") to RulesConfigurable.ID,
        ).forEach { (label, id) ->
            rows.row(ActionLink(label) { e ->
                val src = e.source as? JComponent ?: return@ActionLink
                val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
                settings.find(id)?.let { settings.select(it) }
            }.apply { border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm()) })
        }
        // Own group below the sub-page links, matching AdvancedSettingsUi's separator-per-group idiom.
        rows.row(TitledSeparator(QronosBundle.message("settings.agentBehavior.extended.title")))
        rows.row(SettingsRow(
            QronosBundle.message("settings.agentBehavior.swarm.enabled"),
            QronosBundle.message("settings.agentBehavior.swarm.description"),
            swarm,
        ))
    }

    @RequiresEdt
    fun sync(draft: AgentBehaviorDraft, enabled: Boolean) {
        swarm.isSelected = draft.swarm
        swarm.isEnabled = enabled
    }
}
