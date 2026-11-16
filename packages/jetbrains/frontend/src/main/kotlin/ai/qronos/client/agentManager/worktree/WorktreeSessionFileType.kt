package ai.qronos.client.agentManager.worktree

import ai.qronos.client.plugin.QronosBundle
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.Icon

object WorktreeSessionFileType : FileType {
    override fun getName(): String = "QRONOS_WORKTREE_SESSION"
    override fun getDisplayName(): String = QronosBundle.message("worktree.session.fileType.displayName")
    override fun getDescription(): String = QronosBundle.message("worktree.session.fileType.description")
    override fun getDefaultExtension(): String = "qronos-worktree-session"
    override fun getIcon(): Icon = WorktreeIcons.branch
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
    override fun getCharset(file: VirtualFile, content: ByteArray): String? = null
}
