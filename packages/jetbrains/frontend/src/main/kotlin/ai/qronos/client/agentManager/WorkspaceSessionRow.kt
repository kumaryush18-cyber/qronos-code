package ai.qronos.client.agentManager

import ai.qronos.client.agentManager.worktree.isDefaultSessionTitle
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.SessionActivityKind
import ai.qronos.client.session.history.HistoryItem
import ai.qronos.client.session.history.HistoryTime
import ai.qronos.client.ui.active.ActiveBadge
import ai.qronos.client.ui.list.ActiveSection

internal data class WorkspaceSessionRow(
    val item: HistoryItem,
    private val kind: SessionActivityKind?,
    private val deleting: Boolean = false,
    private val live: String? = null,
    override val search: String = "",
) : ActiveSection {
    override val key: String get() = item.id
    override val title: String get() = sessionRowTitle(live, item.title, QronosBundle.message("worktree.session.untitled"))
    override val tooltip: String get() = title
    override val progress: String? get() = if (deleting) QronosBundle.message("common.deleting") else null
    override val badges: List<ActiveBadge>
        get() = listOfNotNull(kind?.let { ActiveBadge(it.label(), it.style()) })
    override val section: String get() = HistoryTime.title(HistoryTime.section(item))
}

/**
 * Row label shared by local and Cloud session lists: the live title the open session already shows
 * wins over the listed one, and the backend's "New session - <ISO>" placeholder reads as New Session.
 */
internal fun sessionRowTitle(live: String?, listed: String, untitled: String): String {
    val name = live?.takeIf { it.isNotBlank() } ?: listed
    if (name.isBlank()) return untitled
    if (isDefaultSessionTitle(name)) return QronosBundle.message("worktree.session.new")
    return name
}
