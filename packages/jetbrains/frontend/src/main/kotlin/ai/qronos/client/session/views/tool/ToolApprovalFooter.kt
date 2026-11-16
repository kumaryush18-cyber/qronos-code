package ai.qronos.client.session.views.tool

import ai.qronos.client.plugin.QronosPluginSettings
import ai.qronos.client.session.model.Tool
import ai.qronos.client.session.ui.style.SessionEditorStyle
import ai.qronos.client.session.ui.style.SessionUiStyle
import ai.qronos.client.session.views.SessionViewIcons
import ai.qronos.client.ui.PlainLabel
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.layout.Stack
import ai.qronos.client.ui.layout.StackAxis
import com.intellij.ui.components.JBLabel
import com.intellij.util.concurrency.annotations.RequiresEdt

interface ApprovalReasonTarget {
    @RequiresEdt
    fun syncApprovalReason(visible: Boolean): Boolean
}

class ToolApprovalFooter : Stack(StackAxis.HORIZONTAL, UiStyle.Gap.sm()) {
    private val glyph = JBLabel(SessionViewIcons.shield)
    private val label = PlainLabel()

    init {
        next(glyph)
        next(label)
        isVisible = false
    }

    @RequiresEdt
    fun update(tool: Tool, visible: Boolean): Boolean {
        val note = if (visible) describeToolApproval(tool.approval) else null
        var changed = false
        changed = setVisible(this, note != null) || changed
        changed = setVisible(glyph, note != null) || changed
        changed = setVisible(label, note != null) || changed
        changed = setText(label, note?.text.orEmpty()) || changed
        return changed
    }

    @RequiresEdt
    fun applyStyle(style: SessionEditorStyle): Boolean {
        var changed = false
        changed = setFont(label, style.smallEditorFont) || changed
        changed = setFont(glyph, style.smallEditorFont) || changed
        changed = setForeground(label, SessionUiStyle.Text.Secondary.foreground()) || changed
        changed = setForeground(glyph, SessionUiStyle.Text.Secondary.foreground()) || changed
        return changed
    }
}

internal fun approvalReasonsVisible() = QronosPluginSettings.getShowApprovalReason()
