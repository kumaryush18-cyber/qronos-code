package ai.qronos.client.settings.rules

import ai.qronos.client.QronosNotifications
import ai.qronos.client.app.QronosAgentBehaviorService
import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.plugin.QronosDocs
import ai.qronos.client.settings.base.SettingsDraftPage
import ai.qronos.client.settings.base.SettingsDraftState
import ai.qronos.client.settings.base.SettingsInfo
import ai.qronos.client.settings.base.SettingsListPanel
import ai.qronos.client.settings.base.SettingsPathDialog
import ai.qronos.client.settings.base.SettingsRow
import ai.qronos.client.settings.base.SettingsToggle
import ai.qronos.client.settings.base.SettingsToolbarAction
import ai.qronos.client.settings.base.settingsChoosePath
import ai.qronos.client.settings.base.settingsContentScroll
import ai.qronos.client.settings.base.settingsEditorFileType
import ai.qronos.client.ui.CodeViewField
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.layout.Stack
import ai.qronos.client.ui.layout.StackAxis
import ai.qronos.client.ui.active.ActiveCell
import ai.qronos.client.ui.active.ActiveConfig
import ai.qronos.client.ui.active.ActiveItem
import ai.qronos.client.ui.active.ActiveSelection
import ai.qronos.log.QronosLog
import ai.qronos.rpc.dto.QronosAppStateDto
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.application.asContextElement
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.components.service
import com.intellij.openapi.fileChooser.FileChooserDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.ui.TitledSeparator
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.nio.charset.StandardCharsets
import java.nio.file.InvalidPathException
import java.nio.file.Path
import javax.swing.JComponent
import javax.swing.ScrollPaneConstants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val edt = Dispatchers.EDT + ModalityState.any().asContextElement()

internal class RulesSettingsUi(
    scope: CoroutineScope,
    private val root: String? = null,
    private val choose: (JComponent) -> String? = ::chooseRulePath,
    private val input: () -> String? = { promptRulePath(choose) },
    private val read: (String) -> String? = { path -> readInstruction(root, path) },
    private val write: (String, String) -> Boolean = { path, text -> writeInstruction(root, path, text) },
    private val editor: (String, String) -> RuleContentDialogHandle = { title, content -> InstructionEditDialog(title, content) },
    private val app: QronosAppService = service(),
    private val workspaces: QronosWorkspaceService = service(),
    private val agent: QronosAgentBehaviorService = service(),
) : SettingsListPanel(scope, ActiveConfig.Equal.copy(tooltip = false)), SettingsDraftPage {
    private val cs = scope
    private val state = SettingsDraftState(rulesDraft(app.state.value.config, false), ::savedMatches)
    private val draft get() = state.draft
    private var closed = false
    internal val footer = RulesFooterView { value -> updateCompat(value) }

    init {
        start()
        setCenter(ruleScroll())
        content.add(footer, BorderLayout.SOUTH)
        reload()
    }

    override suspend fun fetch(): List<ActiveItem> {
        val compat = agent.claudeCodeCompat()
        return withContext(edt) {
            state.accept(rulesDraft(app.state.value.config, compat))
            footer.refresh(draft.compat)
            rows()
        }
    }

    override fun onCell(key: String, cellId: String) {
        when (cellId) {
            OPEN_CELL -> open(key)
            EDIT_CELL -> editFile(key)
            DELETE_CELL -> remove(key)
        }
    }

    override fun extraActions(): List<AnAction> = listOf(
        SettingsToolbarAction(
            QronosBundle.message("settings.rules.files.add"),
            QronosBundle.message("settings.rules.files.add.description"),
            AllIcons.General.Add,
            { !busy },
        ) { addFile() },
    )

    override fun showRefresh(): Boolean = false

    override fun info(): JComponent = SettingsInfo(
        QronosBundle.message("settings.rules.info"),
        QronosBundle.message("settings.rules.info.more"),
        QronosDocs.RULES,
    )

    override fun searchPlaceholder() = QronosBundle.message("settings.rules.files.search")

    override fun emptyText() = QronosBundle.message("settings.rules.files.empty")

    override fun modified(): Boolean = state.modified()

    override fun resetDraft() {
        state.reset()
        footer.refresh(draft.compat)
        view.update(rows())
        clearProgress()
    }

    override fun applyDraft() {
        val change = rulesChange(state.baseline, draft) ?: return
        val token = state.start() ?: return
        val target = token.target
        showProgress(QronosBundle.message("settings.rules.save.pending"))
        setBusy(true)
        app.scope.launch {
            val wrote = withContext(edt) { target.edited.all { (path, text) -> write(path, text) } }
            val next = when {
                !wrote -> null
                change.config != null -> app.updateConfig(change.config)
                else -> app.state.value
            }
            val ok = next != null && (change.compat == null || agent.setClaudeCodeCompat(change.compat) == change.compat)
            withContext(edt) { finish(token, target, next.takeIf { ok }) }
        }
    }

    @RequiresEdt
    override fun dispose() {
        closed = true
        super.dispose()
    }

    @RequiresEdt
    private fun finish(token: ai.qronos.client.settings.base.SettingsDraftSave<RulesDraft>, target: RulesDraft, next: QronosAppStateDto?) {
        if (closed) {
            if (next != null) QronosNotifications.info(QronosBundle.message("settings.rules.saved.notification"))
            else QronosNotifications.error(QronosBundle.message("settings.rules.save.failed"))
            return
        }
        if (next != null) {
            state.complete(token, rulesDraft(next.config, target.compat))
            LOG.info("rules settings apply succeeded")
        } else {
            state.fail(token, QronosBundle.message("settings.rules.save.failed"))
            showError(QronosBundle.message("settings.rules.save.failed"))
            LOG.warn("rules settings apply failed")
        }
        footer.refresh(draft.compat)
        view.update(rows())
        if (next != null) clearProgress()
        setBusy(false)
    }

    internal fun addFile() {
        val value = input()?.trim()?.takeIf { it.isNotBlank() } ?: return
        if (value in draft.instructions) {
            view.select(value)
            return
        }
        state.update { copy(instructions = instructions + value) }
        view.update(rows(), ActiveSelection.Key(value))
    }

    private fun editFile(path: String) {
        val content = draft.edited[path] ?: read(path)
        if (content == null) {
            QronosNotifications.info(QronosBundle.message("settings.rules.files.cannotEdit"))
            return
        }
        val dialog = editor(path, content)
        if (!dialog.showAndGet()) return
        state.update { copy(edited = edited + (path to dialog.content())) }
        view.update(rows(), ActiveSelection.Key(path))
    }

    private fun remove(path: String) {
        val result = Messages.showYesNoDialog(
            QronosBundle.message("settings.rules.files.delete.message", path),
            QronosBundle.message("settings.rules.files.delete.title"),
            QronosBundle.message("common.delete"),
            Messages.getCancelButton(),
            Messages.getQuestionIcon(),
        )
        if (result != Messages.YES) return
        state.update { copy(instructions = instructions - path, edited = edited - path) }
        view.update(rows(), ActiveSelection.Slide)
    }

    private fun open(path: String) {
        val abs = resolveInstructionPath(root, path)
        if (abs == null) {
            QronosNotifications.error(QronosBundle.message("settings.rules.files.openInEditor.failed"))
            return
        }
        showProgress(QronosBundle.message("settings.rules.files.openInEditor.pending"))
        cs.launch {
            val opened = workspaces.openFile(abs)
            withContext(edt) {
                if (closed) return@withContext
                clearProgress()
                if (!opened) QronosNotifications.error(QronosBundle.message("settings.rules.files.openInEditor.failed"))
            }
        }
    }

    private fun updateCompat(value: Boolean) {
        state.update { copy(compat = value) }
        footer.refresh(draft.compat)
    }

    private fun ruleScroll() = JBScrollPane(view).apply {
        border = null
        horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        verticalScrollBarPolicy = ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED
    }

    private fun rows(): List<ActiveItem> = draft.instructions.map { item(it) }

    private fun item(value: String) = object : ActiveItem {
        override val key = value
        override val title = value
        override val doubleClick = EDIT_CELL
        override val cells = listOf(
            ActiveCell(
                OPEN_CELL,
                QronosBundle.message("settings.rules.files.openInEditor"),
                primary = true,
            ),
            ActiveCell(
                EDIT_CELL,
                QronosBundle.message("settings.agentBehavior.edit"),
            ),
            ActiveCell(
                DELETE_CELL,
                QronosBundle.message("common.delete"),
                icon = AllIcons.Actions.GC,
                iconOnly = true,
            ),
        )
    }

    private companion object {
        const val OPEN_CELL = "open"
        const val EDIT_CELL = "edit"
        const val DELETE_CELL = "delete"
        val LOG = QronosLog.create(RulesSettingsUi::class.java)
    }
}

internal class RulesFooterView(
    private val update: (Boolean) -> Unit,
) : Stack(StackAxis.VERTICAL, UiStyle.Gap.sm()) {
    private val compat = SettingsToggle { value -> update(value) }

    init {
        border = JBUI.Borders.empty(UiStyle.Gap.pad(), 0, 0, UiStyle.Gap.xl())
        next(TitledSeparator(QronosBundle.message("settings.rules.claude.heading")))
        next(SettingsRow(
            QronosBundle.message("settings.rules.claude.title"),
            QronosBundle.message("settings.rules.claude.description"),
            compat,
        ))
    }

    @RequiresEdt
    fun refresh(value: Boolean) {
        compat.isSelected = value
    }
}

internal interface RuleContentDialogHandle {
    fun showAndGet(): Boolean
    fun content(): String
}

/** In-dialog content editor for an instruction file, mirroring the Skills skill editor. */
internal class InstructionEditDialog(
    private val heading: String,
    content: String,
) : DialogWrapper(true), RuleContentDialogHandle {
    private val base = content
    private val field = CodeViewField(base, settingsEditorFileType(heading, base), true)

    init {
        title = heading
        setOKButtonText(com.intellij.CommonBundle.getOkButtonText())
        init()
        isOKActionEnabled = false
        field.document.addDocumentListener(object : com.intellij.openapi.editor.event.DocumentListener {
            override fun documentChanged(event: com.intellij.openapi.editor.event.DocumentEvent) {
                isOKActionEnabled = field.text != base
            }
        })
    }

    override fun createCenterPanel(): JComponent = settingsContentScroll(field)

    override fun content() = field.text
}

private fun chooseRulePath(parent: JComponent): String? = settingsChoosePath(parent, rulePathDescriptor())

private fun promptRulePath(choose: (JComponent) -> String?): String? {
    val dialog = SettingsPathDialog(QronosBundle.message("settings.rules.files.input.title"), browse = choose)
    return if (dialog.showAndGet()) dialog.value() else null
}

internal fun rulePathDescriptor() = FileChooserDescriptor(true, false, false, false, false, false).apply {
    title = QronosBundle.message("settings.rules.files.input.title")
    description = QronosBundle.message("settings.rules.files.input.prompt")
}

private fun resolveInstructionPath(root: String?, path: String): String? = try {
    val nio = Path.of(path.trim())
    when {
        nio.isAbsolute -> nio.normalize().toString()
        root != null -> Path.of(root).resolve(nio).normalize().toString()
        else -> null
    }
} catch (e: InvalidPathException) {
    null
}

@RequiresEdt
private fun readInstruction(root: String?, path: String): String? {
    val abs = resolveInstructionPath(root, path) ?: return null
    val vf = LocalFileSystem.getInstance().findFileByPath(abs)
        ?: LocalFileSystem.getInstance().refreshAndFindFileByPath(abs)
        ?: return null
    if (vf.isDirectory) return null
    return String(vf.contentsToByteArray(), StandardCharsets.UTF_8)
}

@RequiresEdt
private fun writeInstruction(root: String?, path: String, text: String): Boolean {
    val abs = resolveInstructionPath(root, path) ?: return false
    var ok = false
    WriteCommandAction.runWriteCommandAction(null as Project?) {
        val nio = Path.of(abs)
        val lfs = LocalFileSystem.getInstance()
        val target = lfs.refreshAndFindFileByPath(abs) ?: run {
            val parent = nio.parent ?: return@runWriteCommandAction
            val dir = VfsUtil.createDirectoryIfMissing(parent.toString()) ?: return@runWriteCommandAction
            dir.createChildData(RulesSettingsUi::class.java, nio.fileName.toString())
        }
        VfsUtil.saveText(target, text)
        ok = true
    }
    return ok
}
