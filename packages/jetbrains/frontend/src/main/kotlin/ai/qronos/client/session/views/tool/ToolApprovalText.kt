package ai.qronos.client.session.views.tool

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.model.ToolApproval

data class ToolApprovalNote(
    val decision: String,
    val details: String,
) {
    val text: String get() = listOf(decision, details).filter { it.isNotBlank() }.joinToString(" ")
}

fun describeToolApproval(approval: ToolApproval?): ToolApprovalNote? {
    if (approval == null) return null
    val manual = approval.source == "manual"
    val decision = if (manual) {
        QronosBundle.message("session.part.tool.approval.manual")
    } else {
        QronosBundle.message("session.part.tool.approval.auto")
    }
    val parts = buildList {
        if (!manual) source(approval)?.let(::add)
        rule(approval)?.let(::add)
        outside(approval)?.let(::add)
    }
    return ToolApprovalNote(decision, parts.joinToString(" "))
}

private fun source(approval: ToolApproval): String? = when (approval.source) {
    "agent" -> approval.agent
        ?.let { QronosBundle.message("session.part.tool.approval.source.agent", it) }
        ?: QronosBundle.message("session.part.tool.approval.source.agent.default")
    "global" -> QronosBundle.message("session.part.tool.approval.source.global")
    "project" -> QronosBundle.message("session.part.tool.approval.source.project")
    "yolo" -> QronosBundle.message("session.part.tool.approval.source.yolo")
    "session" -> QronosBundle.message("session.part.tool.approval.source.session")
    "default" -> QronosBundle.message("session.part.tool.approval.source.default")
    else -> null
}

private fun rule(approval: ToolApproval): String? {
    val permission = approval.rulePermission ?: return null
    val pattern = approval.rulePattern ?: return null
    if (permission == "*" && pattern == "*") return null
    return QronosBundle.message("session.part.tool.approval.rule", permission, pattern)
}

private fun outside(approval: ToolApproval): String? {
    if (!approval.outsideWorkspace) return null
    val path = approval.outsideWorkspacePath?.takeIf { it.isNotBlank() } ?: return null
    return QronosBundle.message("session.part.tool.approval.outsideWorkspace", tail(path))
}
