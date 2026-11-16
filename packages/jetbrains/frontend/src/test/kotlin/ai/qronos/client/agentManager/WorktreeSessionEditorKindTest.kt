package ai.qronos.client.agentManager

import ai.qronos.client.agentManager.worktree.PendingWorktreeSession
import ai.qronos.client.agentManager.worktree.WorktreeSessionEditorKind
import ai.qronos.client.agentManager.worktree.WorktreeSessionFileType
import ai.qronos.client.agentManager.worktree.WorktreeNameCache
import ai.qronos.client.agentManager.worktree.ensureWorktreeSessionEditorKind
import ai.qronos.client.agentManager.worktree.unregisterWorktreeSessionEditorKind
import ai.qronos.client.agentManager.worktree.worktreeSessionParams
import ai.qronos.client.vfs.QronosEditorKindRegistry
import ai.qronos.client.vfs.QronosPath
import ai.qronos.client.vfs.QronosVirtualFileKindRegistry
import ai.qronos.client.vfs.QronosVirtualFileSystem
import ai.qronos.rpc.dto.GhState
import ai.qronos.rpc.dto.WorktreePrDto
import ai.qronos.rpc.dto.WorktreeDto
import com.intellij.openapi.components.service
import com.intellij.openapi.vfs.VirtualFilePathWrapper
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class WorktreeSessionEditorKindTest : BasePlatformTestCase() {
    override fun tearDown() {
        try {
            service<WorktreeNameCache>().clear()
        } finally {
            super.tearDown()
        }
    }

    fun `test worktree session params use only the worktree path`() {
        val item = WorktreeDto("/repo/.qronos/worktrees/feature-x", "feature-x", "feature/x", "/repo/.qronos/worktrees/feature-x")
        val params = worktreeSessionParams(item)

        assertEquals(mapOf("path" to item.path), params)
    }

    fun `test a moved session is queued out of band so the tab identity stays the path`() {
        val item = WorktreeDto("/repo/.qronos/worktrees/feature-x", "feature-x", "feature/x", "/repo/.qronos/worktrees/feature-x")
        service<PendingWorktreeSession>().put(item.path, "ses_fork")

        // The queued session must not leak into the editor identity, or Agent Manager's path-only
        // open/close/rename would address a different file than the tab a move produced.
        assertEquals(mapOf("path" to item.path), worktreeSessionParams(item))
        // Keyed by normalized path, and consumed once so a later open starts a fresh session.
        assertEquals("ses_fork", service<PendingWorktreeSession>().take(item.path + "/"))
        assertNull(service<PendingWorktreeSession>().take(item.path))
    }

    fun `test worktree session kind creates a custom virtual file type`() {
        ensureWorktreeSessionEditorKind()
        val fs = QronosVirtualFileSystem.getInstance()
        val path = QronosPath(WorktreeSessionEditorKind.ID, mapOf("path" to "/repo/.qronos/worktrees/feature-x"))
        val file = fs.findOrCreateFile(path)

        assertNotNull(file)
        assertSame(WorktreeSessionFileType, file!!.fileType)
        assertEquals("feature-x", file.name)
        assertEquals("/repo/.qronos/worktrees/feature-x", (file as VirtualFilePathWrapper).presentablePath)
        assertNotNull(service<QronosEditorKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNotNull(service<QronosVirtualFileKindRegistry>().get(WorktreeSessionEditorKind.ID))

        unregisterWorktreeSessionEditorKind()
        fs.clear()

        assertNull(service<QronosEditorKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNull(service<QronosVirtualFileKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNull(fs.findOrCreateFile(path))
    }

    fun `test worktree session title uses cached label`() {
        val path = "/repo/.qronos/worktrees/feature-x"
        service<WorktreeNameCache>().put(path, "Feature Label")

        assertEquals("Feature Label", WorktreeSessionEditorKind.title(mapOf("path" to path)))
    }

    fun `test worktree session title uses same winning label as worktree list`() {
        val path = "/repo/.qronos/worktrees/feature-x"
        service<WorktreeNameCache>().put(path, "Feature Label")
        service<WorktreeNameCache>().putPr(path, WorktreePrDto(path, 3, GhState.OPEN, "https://example.test/pr/3", "PR Label"))

        assertEquals("PR Label", WorktreeSessionEditorKind.title(mapOf("path" to path)))
    }
}
