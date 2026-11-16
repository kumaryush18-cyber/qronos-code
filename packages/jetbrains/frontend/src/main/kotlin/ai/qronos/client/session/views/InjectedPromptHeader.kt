package ai.qronos.client.session.views

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.ui.style.SessionEditorStyle
import ai.qronos.client.session.ui.style.SessionUiStyle
import ai.qronos.client.ui.UiStyle
import com.intellij.ui.HyperlinkLabel
import com.intellij.ui.components.JBLabel
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import javax.swing.JPanel

/** Header above a prompt Qronos composed, e.g. "Sent by Qronos · Update from main". */
internal class InjectedPromptHeader(
    private val onToggle: (Boolean) -> Unit,
) : JPanel(BorderLayout()) {
    private val label = JBLabel()
    private val toggle = HyperlinkLabel()
    private var open = false

    init {
        isOpaque = false
        border = JBUI.Borders.empty(
            JBUI.scale(SessionUiStyle.View.Prompt.SHELL_VERTICAL_PADDING),
            JBUI.scale(SessionUiStyle.View.Prompt.SHELL_HORIZONTAL_PADDING),
            UiStyle.Gap.xs(),
            JBUI.scale(SessionUiStyle.View.Prompt.SHELL_HORIZONTAL_PADDING),
        )
        label.foreground = SessionUiStyle.Text.Secondary.foreground()
        add(label, BorderLayout.WEST)
        add(toggle, BorderLayout.EAST)
        toggle.addHyperlinkListener {
            open = !open
            syncToggle()
            onToggle(open)
        }
    }

    @RequiresEdt
    fun update(title: String, hasPreview: Boolean, expanded: Boolean) {
        open = expanded
        label.text = QronosBundle.message("session.injected.sent", title)
        toggle.isVisible = hasPreview
        syncToggle()
    }

    @RequiresEdt
    fun applyStyle(style: SessionEditorStyle) {
        label.font = style.smallFont
        toggle.font = style.smallFont
        label.foreground = SessionUiStyle.Text.Secondary.foreground()
    }

    @RequiresEdt
    private fun syncToggle() {
        toggle.setHyperlinkText(
            QronosBundle.message(if (open) "session.injected.hide" else "session.injected.show"),
        )
    }
}
