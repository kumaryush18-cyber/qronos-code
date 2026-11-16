package ai.qronos.client.ui.active

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.ui.UiStyle
import ai.qronos.client.ui.layout.Stack
import ai.qronos.client.ui.layout.StackAxis
import com.intellij.openapi.ui.popup.Balloon
import com.intellij.ui.awt.RelativePoint
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.UIUtil
import javax.swing.JComponent

data class ActiveDeleteOptions(
    val message: String,
    val detail: String? = null,
    val gate: String? = null,
    val button: String = QronosBundle.message("common.delete"),
)

internal fun activeDeleteContent(
    opts: ActiveDeleteOptions,
    hide: () -> Unit,
    confirm: (Boolean) -> Unit,
): JComponent {
    return activeDeletePopup(opts, hide, confirm).component
}

internal fun showActiveDeletePopup(
    anchor: RelativePoint,
    opts: ActiveDeleteOptions,
    confirm: (Boolean) -> Unit,
): Balloon {
    lateinit var balloon: Balloon
    val popup = activeDeletePopup(opts, hide = { balloon.hide(true) }, confirm)
    balloon = showActivePopup(anchor, popup)
    return balloon
}

private fun activeDeletePopup(
    opts: ActiveDeleteOptions,
    hide: () -> Unit,
    confirm: (Boolean) -> Unit,
): ActiveListPopup {
    val gate = opts.gate?.let {
        JBCheckBox(it).apply { isOpaque = false }
    }
    val body = Stack(StackAxis.VERTICAL, UiStyle.Gap.sm()).apply {
        next(JBLabel(opts.message))
        opts.detail?.takeIf { it.isNotBlank() }?.let { text ->
            next(JBLabel(text).apply {
                foreground = UIUtil.getContextHelpForeground()
            })
        }
        gate?.let { next(it) }
    }
    val popup = activePopup(
        body = body,
        button = opts.button,
        enabled = { gate?.isSelected ?: true },
        hide = hide,
        perform = { confirm(gate?.isSelected == true) },
    )
    gate?.addActionListener { popup.sync() }
    return popup
}
