package ai.qronos.client.agentManager.hosted

import ai.qronos.client.agentManager.sessionRowTitle
import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.SessionActivityKind
import ai.qronos.client.session.history.HostedHistoryItem
import ai.qronos.client.session.history.HistoryTime
import ai.qronos.client.ui.active.ActiveBadge
import ai.qronos.client.ui.active.ActiveCell
import ai.qronos.client.ui.active.ActiveItem
import ai.qronos.client.ui.list.ActiveSection

internal class HostedSessionRow(
    private val item: HostedHistoryItem,
    private val kind: SessionActivityKind?,
    private val live: String?,
    private val closed: Boolean,
    private val toggle: (HostedHistoryItem) -> Unit,
) : ActiveSection {
    override val key: String get() = item.id
    override val title: String
        get() = sessionRowTitle(live, item.title, QronosBundle.message("hosted.workspace.session.untitled"))
    override val note: String? get() = if (closed) QronosBundle.message("hosted.workspace.session.closed") else null
    override val tooltip: String get() = title
    override val section: String get() = HistoryTime.title(HistoryTime.section(item))
    override val badges: List<ActiveBadge>
        get() = listOfNotNull(kind?.let { ActiveBadge(it.label(), it.style()) })
    override val cells: List<ActiveCell>
        get() = listOf(
            ActiveCell(
                id = if (closed) "reopen" else "close",
                label = QronosBundle.message(if (closed) "hosted.workspace.session.reopen" else "hosted.workspace.session.close"),
                enabled = true,
                action = { toggle(item) },
            ),
        )

    override fun equals(other: Any?): Boolean {
        val row = other as? HostedSessionRow ?: return false
        return item == row.item && kind == row.kind && live == row.live && closed == row.closed
    }

    override fun hashCode(): Int = listOf(item, kind, live, closed).hashCode()
}
