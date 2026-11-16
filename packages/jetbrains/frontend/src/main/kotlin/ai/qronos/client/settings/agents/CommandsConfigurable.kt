package ai.qronos.client.settings.agents

import ai.qronos.client.QronosNotifications
import ai.qronos.client.app.QronosAgentBehaviorService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.plugin.QronosDocs
import ai.qronos.client.settings.base.DirectoryReadyConfigurable
import ai.qronos.client.settings.base.SettingsDraftPage
import ai.qronos.client.settings.base.SettingsDraftState
import ai.qronos.client.settings.base.SettingsInfo
import ai.qronos.client.settings.base.SettingsListPanel
import ai.qronos.client.settings.base.SettingsMessageException
import ai.qronos.client.settings.base.settingsContentScroll
import ai.qronos.client.settings.base.settingsEditorFileType
import ai.qronos.client.ui.CodeViewField
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.active.ActiveBadge
import ai.qronos.client.ui.active.ActiveCell
import ai.qronos.client.ui.active.ActiveConfig
import ai.qronos.client.ui.active.ActiveItem
import ai.qronos.client.ui.active.ActiveSelection
import ai.qronos.log.QronosLog
import ai.qronos.rpc.dto.CommandFileDto
import com.intellij.CommonBundle
import com.intellij.icons.AllIcons
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.application.asContextElement
import com.intellij.openapi.components.service
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.ui.components.JBScrollPane
import javax.swing.JComponent
import javax.swing.ScrollPaneConstants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

private val edt = Dispatchers.EDT + ModalityState.any().asContextElement()

class CommandsConfigurable : DirectoryReadyConfigurable<JComponent>() {
    override fun getId(): String = ID
    override fun getDisplayName(): String = QronosBundle.message("settings.agentBehavior.commands.displayName")
    override fun create(cs: CoroutineScope, dir: String): JComponent = CommandsSettingsUi(cs, dir)
    override fun update(ui: JComponent, dir: String) {
        (ui as? CommandsSettingsUi)?.setDirectory(dir)
    }
    override fun scrollReadyShell() = false

    companion object { const val ID = "ai.qronos.jetbrains.settings.agentBehavior.commands" }
}

internal class CommandsSettingsUi(
    scope: CoroutineScope,
    dir: String,
    private val edit: (CommandFileDto, Boolean) -> CommandEditDialogHandle = ::CommandEditDialog,
) : SettingsListPanel(scope, ActiveConfig.Equal.copy(tooltip = false)), SettingsDraftPage {
    private var dir = dir
    private var commands = emptyMap<String, CommandFileDto>()
    private val state = SettingsDraftState(commandsDraft(), ::saved)
    private var draft: CommandsDraft
        get() = state.draft
        set(value) {
            state.draft = value
        }

    init {
        start()
        setCenter(scroll())
    }

    fun setDirectory(value: String) {
        if (value == dir) return
        dir = value
        reload()
    }

    override suspend fun fetch(): List<ActiveItem> {
        val items = withTimeoutOrNull(LOAD_TIMEOUT_MS) {
            service<QronosAgentBehaviorService>().loadCommandFiles(dir)
        } ?: throw SettingsMessageException(QronosBundle.message("settings.agentBehavior.commands.load.timeout"))
        withContext(edt) {
            val dirty = state.modified()
            val edit = draft
            state.accept(commandsDraft())
            if (dirty) draft = state.draft.copy(edited = edit.edited, deleted = edit.deleted)
            commands = items.associateBy { key(it) }
        }
        LOG.info("commands settings fetch dir=$dir total=${items.size}")
        return rows(items)
    }

    override fun onCell(key: String, cellId: String) {
        val cmd = commands[key] ?: return
        when (cellId) {
            OPEN_CELL -> open(cmd)
            EDIT_CELL -> edit(cmd)
            DELETE_CELL -> remove(cmd)
        }
    }

    override fun info(): JComponent = SettingsInfo(
        QronosBundle.message("settings.agentBehavior.commands.info"),
        QronosBundle.message("settings.agentBehavior.commands.info.more"),
        QronosDocs.COMMANDS,
    )

    override fun searchPlaceholder() = QronosBundle.message("settings.agentBehavior.commands.search")

    override fun emptyText() = QronosBundle.message("settings.agentBehavior.commands.empty")

    override fun modified(): Boolean = state.modified()

    override fun resetDraft() {
        state.reset()
        view.update(rows())
        clearProgress()
    }

    override fun applyDraft() {
        val token = state.start() ?: return
        val retained = fallback(token.target)
        if (!launch("apply") { id ->
            val target = token.target
            var failed: String? = null
            val behavior = service<QronosAgentBehaviorService>()
            LOG.info("commands settings apply start dir=$dir edited=${target.edited.size} deleted=${target.deleted.size}")
            if (target.edited.isNotEmpty() && !behavior.saveCommands(dir, target.edited)) {
                failed = QronosBundle.message("settings.agentBehavior.save.failed")
            }
            if (failed == null) {
                for (location in target.deleted) {
                    if (!behavior.removeCommand(dir, location)) {
                        failed = QronosBundle.message("settings.agentBehavior.commands.delete.failed")
                        break
                    }
                }
            }
            val reloaded = if (failed == null) behavior.reloadCommands(dir) else true
            val items = behavior.refreshCommandFiles(dir, retained)
            withContext(edt) {
                if (!active(id)) {
                    if (failed == null) QronosNotifications.info(QronosBundle.message("settings.agentBehavior.commands.saved.notification"))
                    else QronosNotifications.error(failed)
                    return@withContext
                }
                if (failed == null) {
                    commands = items.associateBy { key(it) }
                    state.complete(token, commandsDraft())
                    view.update(rows(items))
                    if (reloaded) clearProgress() else showProgress(QronosBundle.message("settings.agentBehavior.commands.reload.blocked"))
                    LOG.info("commands settings apply succeeded dir=$dir")
                } else {
                    state.fail(token, failed)
                    view.update(rows(items))
                    showError(failed)
                    LOG.warn("commands settings apply failed dir=$dir message=$failed")
                }
                setBusy(false)
            }
        }) {
            val failed = QronosBundle.message("settings.agentBehavior.save.failed")
            state.fail(token, failed)
            showError(failed)
            return
        }
        showProgress(QronosBundle.message("settings.agentBehavior.saving"))
    }

    private fun scroll() = JBScrollPane(view).apply {
        border = null
        horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        verticalScrollBarPolicy = ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED
    }

    private fun rows(items: List<CommandFileDto> = commands.values.toList()): List<ActiveItem> = items.mapNotNull { cmd ->
        if (cmd.location in draft.deleted) return@mapNotNull null
        item(cmd)
    }

    private fun fallback(target: CommandsDraft): List<CommandFileDto> = commands.values.mapNotNull { cmd ->
        if (cmd.location in target.deleted) return@mapNotNull null
        target.edited[cmd.location]?.let { cmd.copy(content = it) } ?: cmd
    }

    private fun item(cmd: CommandFileDto) = object : ActiveItem {
        override val key = key(cmd)
        override val title = "/${cmd.name}"
        override val note = cmd.location.takeUnless { builtin(cmd) }
        override val description = cmd.description
        override val doubleClick = EDIT_CELL
        override val badges = listOf(
            ActiveBadge(QronosBundle.message("settings.agentBehavior.badge.builtin"), UiStyle.Badge.Secondary),
        ).takeIf { builtin(cmd) } ?: emptyList()
        override val cells = listOfNotNull(
            ActiveCell(
                OPEN_CELL,
                QronosBundle.message("settings.agentBehavior.commands.openInEditor"),
                primary = true,
            ).takeIf { cmd.editable },
            ActiveCell(
                EDIT_CELL,
                QronosBundle.message(if (cmd.editable) "settings.agentBehavior.edit" else "common.open"),
                primary = !cmd.editable,
            ),
            ActiveCell(
                DELETE_CELL,
                QronosBundle.message("common.delete"),
                icon = AllIcons.Actions.GC,
                iconOnly = true,
            ).takeIf { cmd.editable },
        )
    }

    private fun edit(cmd: CommandFileDto) {
        val current = cmd.copy(content = content(cmd))
        val dialog = edit(current, cmd.editable)
        if (!cmd.editable) {
            dialog.showAndGet()
            return
        }
        if (!dialog.showAndGet()) return
        state.update { copy(edited = edited + (cmd.location to dialog.content())) }
        view.update(rows(), ActiveSelection.Key(key(cmd)))
    }

    private fun open(cmd: CommandFileDto) {
        if (!cmd.editable) return
        if (!launch("open") { id ->
            val opened = service<QronosWorkspaceService>().openFile(cmd.location)
            withContext(edt) {
                if (!active(id)) return@withContext
                setBusy(false)
                if (opened) return@withContext
                clearProgress()
                QronosNotifications.error(QronosBundle.message("settings.agentBehavior.commands.openInEditor.failed"))
            }
        }) return
        showProgress(QronosBundle.message("settings.agentBehavior.commands.openInEditor.pending"))
    }

    private fun remove(cmd: CommandFileDto) {
        val result = Messages.showYesNoDialog(
            QronosBundle.message("settings.agentBehavior.commands.delete.message", cmd.name),
            QronosBundle.message("settings.agentBehavior.commands.delete.title"),
            QronosBundle.message("common.delete"),
            Messages.getCancelButton(),
            Messages.getQuestionIcon(),
        )
        if (result != Messages.YES) return
        state.update { copy(deleted = deleted + cmd.location, edited = edited - cmd.location) }
        view.update(rows(), ActiveSelection.Slide)
    }

    private fun content(cmd: CommandFileDto) = draft.edited[cmd.location] ?: cmd.content

    private companion object {
        const val EDIT_CELL = "edit"
        const val OPEN_CELL = "open"
        const val DELETE_CELL = "delete"
        const val BUILTIN = "builtin"
        const val LEGACY_BUILTIN = "<built-in>"
        val LOG = QronosLog.create(CommandsSettingsUi::class.java)

        fun key(cmd: CommandFileDto) = if (builtin(cmd)) {
            listOf("builtin", cmd.source.orEmpty(), cmd.name).joinToString(":")
        } else {
            cmd.location.ifBlank { cmd.name }
        }
        fun builtin(cmd: CommandFileDto) = cmd.builtin || cmd.location == BUILTIN || cmd.location == LEGACY_BUILTIN
    }
}

internal interface CommandEditDialogHandle {
    fun showAndGet(): Boolean
    fun content(): String
}

private data class CommandsDraft(
    val edited: Map<String, String> = emptyMap(),
    val deleted: Set<String> = emptySet(),
)

private fun commandsDraft() = CommandsDraft()

private fun saved(base: CommandsDraft, draft: CommandsDraft): Boolean = base == draft

internal class CommandEditDialog(private val cmd: CommandFileDto, private val savable: Boolean) : DialogWrapper(true), CommandEditDialogHandle {
    private val base = initial()
    private val editor = CodeViewField(base, commandFileType(cmd.location, base), savable)

    init {
        title = "/${cmd.name}"
        setOKButtonText(CommonBundle.getOkButtonText())
        setCancelButtonText(CommonBundle.getCloseButtonText())
        init()
        isOKActionEnabled = false
        editor.document.addDocumentListener(object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                isOKActionEnabled = savable && editor.text != base
            }
        })
    }

    override fun createCenterPanel(): JComponent = settingsContentScroll(editor)

    override fun createActions() = if (savable) arrayOf(okAction, cancelAction) else arrayOf(cancelAction)

    override fun content() = editor.text

    private fun initial() = cmd.content?.takeIf { it.isNotBlank() }
        ?: cmd.description?.takeIf { it.isNotBlank() }
        ?: QronosBundle.message("settings.agentBehavior.commands.content.empty")
}

internal fun commandFileType(location: String, content: String? = null): FileType =
    settingsEditorFileType(location.ifBlank { COMMAND_FILE }, content)

private const val COMMAND_FILE = "command.md"
private const val LOAD_TIMEOUT_MS = 10_000L
