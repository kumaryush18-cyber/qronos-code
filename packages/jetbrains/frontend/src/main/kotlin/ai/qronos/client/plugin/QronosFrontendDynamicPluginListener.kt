package ai.qronos.client.plugin

import ai.qronos.QronosPlugin
import ai.qronos.client.QRONOS_TOOL_WINDOW_ID
import ai.qronos.client.agentManager.worktree.unregisterWorktreeSessionEditorKind
import ai.qronos.client.session.ui.attachment.unregisterAttachmentEditorKind
import ai.qronos.client.ui.diagram.ui.DiagramWindows
import ai.qronos.client.ui.diagram.ui.unregisterDiagramEditorKind
import ai.qronos.client.vfs.QronosEditorKindRegistry
import ai.qronos.client.vfs.QronosVirtualFileSystem
import ai.qronos.log.QronosLog
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.wm.ToolWindowManager
import javax.swing.SwingUtilities

class QronosFrontendDynamicPluginListener : DynamicPluginListener {
    override fun beforePluginUnload(pluginDescriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        if (pluginDescriptor.pluginId != QronosPlugin.id) return
        QronosFrontendUnloadCleanup.cleanup(isUpdate)
    }
}

object QronosFrontendUnloadCleanup {
    private val log = QronosLog.create(QronosFrontendUnloadCleanup::class.java)

    fun cleanup(isUpdate: Boolean) {
        log.info("Cleaning up Qronos frontend for plugin unload (isUpdate=$isUpdate)")
        runEdt {
            ProjectManager.getInstance().openProjects.forEach { project ->
                if (project.isDisposed) return@forEach
                project.getServiceIfCreated(DiagramWindows::class.java)?.closeAll()
                ToolWindowManager.getInstance(project).getToolWindow(QRONOS_TOOL_WINDOW_ID)
                    ?.contentManager
                    ?.removeAllContents(true)
                val editors = FileEditorManager.getInstance(project).openFiles
                    .filter { it.fileSystem === QronosVirtualFileSystem.getInstance() }
                editors.forEach { file -> FileEditorManager.getInstance(project).closeFile(file) }
            }
        }
        unregisterAttachmentEditorKind()
        unregisterWorktreeSessionEditorKind()
        unregisterDiagramEditorKind()
        service<QronosEditorKindRegistry>().clear()
        QronosVirtualFileSystem.getInstance().clear()
    }

    private fun runEdt(block: () -> Unit) {
        if (SwingUtilities.isEventDispatchThread()) {
            block()
            return
        }
        SwingUtilities.invokeAndWait(block)
    }
}
