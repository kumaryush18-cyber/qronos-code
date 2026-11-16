package ai.qronos.client.vfs

import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile

class QronosSourceEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        return qronosKind(file)?.source != null
    }

    override fun acceptRequiresReadAction(): Boolean = false

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        val path = qronosPath(file) ?: error("Invalid Qronos virtual file: ${file.path}")
        val qronos = file as? QronosVirtualFile ?: QronosVirtualFile(path)
        val kind = service<QronosEditorKindRegistry>().get(qronos.path.kind) ?: error("Unknown Qronos editor kind: ${qronos.path.kind}")
        val view = kind.source ?: error("Qronos editor kind has no source view: ${qronos.path.kind}")
        return QronosFileEditor(project, file, qronos, view)
    }

    override fun disposeEditor(editor: FileEditor) {
        Disposer.dispose(editor)
    }

    override fun getEditorTypeId(): String = EDITOR_TYPE_ID
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_OTHER_EDITORS

    companion object {
        const val EDITOR_TYPE_ID = "QronosVfsSourceEditor"
    }
}
