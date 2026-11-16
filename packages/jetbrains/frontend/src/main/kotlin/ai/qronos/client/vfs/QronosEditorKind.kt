package ai.qronos.client.vfs

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.util.concurrency.annotations.RequiresEdt
import javax.swing.JComponent

interface QronosEditorView {
    fun title(params: Map<String, String>): String

    @RequiresEdt
    fun createContent(project: Project, file: QronosVirtualFile, parent: Disposable): JComponent

    fun preferredFocus(component: JComponent): JComponent? = null
}

interface QronosEditorKind : QronosVirtualFileKind, QronosEditorView {
    val source: QronosEditorView? get() = null
}
