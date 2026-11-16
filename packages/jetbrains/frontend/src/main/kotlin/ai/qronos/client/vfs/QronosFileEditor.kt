package ai.qronos.client.vfs

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.concurrency.annotations.RequiresEdt
import javax.swing.JComponent

class QronosFileEditor(
    private val project: Project,
    private val file: VirtualFile,
    private val qronos: QronosVirtualFile,
    private val view: QronosEditorView,
) : QronosFileEditorBase() {
    private val ui: JComponent by lazy { view.createContent(project, qronos, this) }

    @RequiresEdt
    override fun getComponent(): JComponent = ui

    override fun getPreferredFocusedComponent(): JComponent? = view.preferredFocus(ui)
    override fun getName(): String = view.title(qronos.path.params)
    override fun getFile(): VirtualFile = file
    override fun isValid(): Boolean = super.isValid() && qronos.isValid

    override fun dispose() {
        QronosVirtualFileSystem.getInstance().release(qronos.path)
        super.dispose()
    }
}
