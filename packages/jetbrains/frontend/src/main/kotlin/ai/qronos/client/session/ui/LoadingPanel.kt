package ai.qronos.client.session.ui

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.session.model.SessionState
import ai.qronos.client.session.ui.style.SessionEditorStyle
import ai.qronos.client.session.ui.style.SessionEditorStyleTarget
import ai.qronos.client.session.ui.style.SessionUiStyle
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.layout.HAlign
import ai.qronos.client.ui.layout.VAlign
import ai.qronos.client.ui.layout.align
import java.awt.BorderLayout
import javax.swing.JPanel

class LoadingPanel : JPanel(BorderLayout()), SessionEditorStyleTarget {
    private var text = QronosBundle.message("session.empty.loading")
    private val label = StatusLabel(centered = true)

    init {
        isOpaque = false
        label.sync(text)
        add(label.align(HAlign.TRACK, VAlign.CENTER), BorderLayout.CENTER)
        applyStyle(SessionEditorStyle.current())
    }

    fun setState(state: SessionState) {
        when (state) {
            is SessionState.Retry -> {
                text = state.message.ifBlank { QronosBundle.message("session.status.retry") }
                label.foreground = UiStyle.Colors.warningLabelForeground()
            }

            is SessionState.Offline -> {
                text = state.message.ifBlank { QronosBundle.message("session.status.offline") }
                label.foreground = UiStyle.Colors.errorLabelForeground()
            }

            else -> {
                text = QronosBundle.message("session.empty.loading")
                label.foreground = SessionUiStyle.Text.Secondary.foreground()
            }
        }
        label.sync(text)
        revalidate()
        repaint()
    }

    /** Exposed for test assertions. */
    fun labelText(): String = text

    override fun applyStyle(style: SessionEditorStyle) {
        label.font = style.regularFont
        revalidate()
        repaint()
    }
}
