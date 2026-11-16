package ai.qronos.client.vfs

import ai.qronos.client.agentManager.worktree.ensureWorktreeSessionEditorKind
import ai.qronos.client.diff.ensureDiffEditorKind
import ai.qronos.client.session.subagent.ensureSubagentSessionEditorKind
import ai.qronos.client.session.ui.attachment.ensureAttachmentEditorKind
import ai.qronos.client.ui.diagram.ui.ensureDiagramEditorKind
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile

class QronosFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        return qronosKind(file) != null
    }

    override fun acceptRequiresReadAction(): Boolean = false

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        ensureQronosKinds()
        val path = qronosPath(file) ?: error("Invalid Qronos virtual file: ${file.path}")
        val qronos = file as? QronosVirtualFile ?: QronosVirtualFile(path)
        val kind = service<QronosEditorKindRegistry>().get(qronos.path.kind) ?: error("Unknown Qronos editor kind: ${qronos.path.kind}")
        return QronosFileEditor(project, file, qronos, kind)
    }

    override fun disposeEditor(editor: FileEditor) {
        Disposer.dispose(editor)
    }

    override fun getEditorTypeId(): String = EDITOR_TYPE_ID
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_OTHER_EDITORS

    companion object {
        const val EDITOR_TYPE_ID = "QronosVfsEditor"
    }
}

internal fun qronosKind(file: VirtualFile): QronosEditorKind? {
    ensureQronosKinds()
    val path = qronosPath(file) ?: return null
    return service<QronosEditorKindRegistry>().get(path.kind)
}

internal fun qronosPath(file: VirtualFile): QronosPath? {
    if (file is QronosVirtualFile) return file.path
    if (file.fileSystem.protocol != QronosVirtualFileSystem.PROTOCOL && !file.url.startsWith("${QronosVirtualFileSystem.PROTOCOL}://")) return null
    return QronosVirtualFileSystem.decode(file.path) ?: QronosVirtualFileSystem.decode(file.url)
}

private fun ensureQronosKinds() {
    ensureAttachmentEditorKind()
    ensureDiffEditorKind()
    ensureSubagentSessionEditorKind()
    ensureWorktreeSessionEditorKind()
    ensureDiagramEditorKind()
    ai.qronos.client.agentManager.hosted.ensureHostedWorkspaceEditorKind()
}
