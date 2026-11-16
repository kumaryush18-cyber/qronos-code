package ai.qronos.client.vfs

import ai.qronos.client.util.edtWait
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.components.BorderLayoutPanel
import javax.swing.JComponent

@Suppress("UnstableApiUsage")
class QronosVfsManagerTest : BasePlatformTestCase() {
    private val kind = "test-close"

    override fun setUp() {
        super.setUp()
        service<QronosEditorKindRegistry>().register(TestKind)
    }

    override fun tearDown() {
        try {
            service<QronosEditorKindRegistry>().unregister(kind)
            QronosVirtualFileSystem.getInstance().clear()
        } finally {
            super.tearDown()
        }
    }

    fun `test close closes the open editor and releases the cache`() {
        val params = mapOf("path" to "/repo/wt")
        val vfs = project.service<QronosVfsManager>()
        val manager = FileEditorManager.getInstance(project)

        edtWait { assertTrue(vfs.open(kind, params)) }
        assertTrue(manager.openFiles.any { it is QronosVirtualFile })

        edtWait { vfs.close(kind, params) }

        assertTrue(manager.openFiles.none { it is QronosVirtualFile })
        assertNull(QronosVirtualFileSystem.getInstance().cached(QronosPath(kind, params)))
    }

    fun `test close matches by canonical params after the cache was released`() {
        // Two params so canonicalization sorts them; open and close use different insertion orders.
        val opened = linkedMapOf("path" to "/repo/wt", "extra" to "1")
        val closed = linkedMapOf("extra" to "1", "path" to "/repo/wt")
        val vfs = project.service<QronosVfsManager>()
        val manager = FileEditorManager.getInstance(project)

        edtWait { assertTrue(vfs.open(kind, opened)) }
        assertTrue(manager.openFiles.any { it is QronosVirtualFile })

        // Drop the VFS cache entry so close() must fall back to scanning the open editors.
        QronosVirtualFileSystem.getInstance().release(QronosPath(kind, opened))
        assertNull(QronosVirtualFileSystem.getInstance().cached(QronosPath(kind, opened)))

        edtWait { vfs.close(kind, closed) }

        assertTrue(manager.openFiles.none { it is QronosVirtualFile })
    }

    private object TestKind : QronosEditorKind {
        override val id: String = "test-close"

        override fun title(params: Map<String, String>): String = "Test"

        override fun createContent(project: Project, file: QronosVirtualFile, parent: Disposable): JComponent =
            BorderLayoutPanel()
    }
}
