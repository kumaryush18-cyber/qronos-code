package ai.qronos.client.agentManager.worktree

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.agentManager.WorkspaceSessionHeader
import ai.qronos.client.ui.ToolbarButtonAction
import ai.qronos.client.ui.hoverIconButton
import ai.qronos.client.ui.hoverTextButton
import com.intellij.ide.ui.ProductIcons
import com.intellij.util.concurrency.annotations.RequiresEdt
import org.jetbrains.plugins.terminal.TerminalIcons
import javax.swing.JComponent

/**
 * Worktree session editor header. A thin wrapper over the shared [WorkspaceSessionHeader] that adds the
 * optional Run control plus Open-in-window and Terminal actions into the header's trailing slot.
 */
internal class WorktreePrHeaderView @RequiresEdt constructor(
    openWorktree: () -> Unit = {},
    openEnabled: Boolean = true,
    openTerminal: () -> Unit = {},
    onLocal: (() -> Unit)? = null,
    run: JComponent? = null,
    openDiff: () -> Unit,
) : WorkspaceSessionHeader(openDiff = openDiff, onLocal = onLocal) {
    private val open = hoverTextButton(
        ToolbarButtonAction(ProductIcons.getInstance().productIcon, QronosBundle.message("worktree.session.open.action"), openWorktree),
        tooltip = QronosBundle.message("worktree.session.open.tooltip"),
    )
    // Icon-only: the tooltip text stands in for the visible label and doubles as the accessible name.
    private val terminal = hoverIconButton(
        ToolbarButtonAction(TerminalIcons.OpenTerminal_13x13, QronosBundle.message("worktree.session.terminal.tooltip"), openTerminal),
    )

    init {
        open.isEnabled = openEnabled
        terminal.isEnabled = openEnabled
        run?.let { addAction(it) }
        addAction(open)
        addAction(terminal)
    }
}
