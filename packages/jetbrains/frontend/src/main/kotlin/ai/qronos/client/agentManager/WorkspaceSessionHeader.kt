package ai.qronos.client.agentManager

import ai.qronos.client.session.ui.header.PrHeaderView
import ai.qronos.client.ui.ChangesPanel
import ai.qronos.rpc.dto.WorktreeDirtyDto
import ai.qronos.rpc.dto.WorktreePrDto
import ai.qronos.rpc.dto.WorktreeStatsDto
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import javax.swing.JComponent

/** Same title, changes summary, and action slots for both workspace backends. */
internal open class WorkspaceSessionHeader @RequiresEdt constructor(
    openDiff: () -> Unit = {},
    onLocal: (() -> Unit)? = null,
) : BorderLayoutPanel() {
    private val core = PrHeaderView(
        mode = ChangesPanel.Mode.FULL, openDiff = openDiff, onLocal = onLocal, fallback = true,
    )

    init {
        isOpaque = false
        addToCenter(core)
    }

    @RequiresEdt
    fun addAction(component: JComponent) = core.addAction(component)

    @RequiresEdt
    fun update(stats: WorktreeStatsDto?, pull: WorktreePrDto?, name: String, dirty: WorktreeDirtyDto? = null) {
        core.update(
            files = stats?.files ?: 0,
            additions = stats?.additions ?: 0,
            deletions = stats?.deletions ?: 0,
            pull = pull,
            name = name,
            ahead = stats?.ahead ?: 0,
            behind = stats?.behind ?: 0,
            localFiles = dirty?.files ?: 0,
            localAdditions = dirty?.additions ?: 0,
            localDeletions = dirty?.deletions ?: 0,
            base = stats?.base.orEmpty(),
        )
    }
}
