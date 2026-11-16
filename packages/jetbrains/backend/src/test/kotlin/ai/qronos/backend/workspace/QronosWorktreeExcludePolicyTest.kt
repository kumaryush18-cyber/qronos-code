package ai.qronos.backend.workspace

import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class QronosWorktreeExcludePolicyTest : BasePlatformTestCase() {
    override fun tearDown() {
        try {
            QronosWorktreeIndexSettings.set(false)
        } finally {
            super.tearDown()
        }
    }

    fun `test excludes qronos worktrees under the project base path by default`() {
        val base = project.basePath!!
        val policy = QronosWorktreeExcludePolicy(project)

        assertOrderedEquals(
            policy.getExcludeUrlsForProject().toList(),
            listOf(VfsUtilCore.pathToUrl("$base/.qronos/worktrees")),
        )
    }

    fun `test returns nothing when indexing worktrees is enabled`() {
        QronosWorktreeIndexSettings.set(true)
        val policy = QronosWorktreeExcludePolicy(project)

        assertEmpty(policy.getExcludeUrlsForProject().toList())
    }

    fun `test returns nothing when the project has no base path`() {
        val default = ProjectManager.getInstance().defaultProject
        val policy = QronosWorktreeExcludePolicy(default)

        assertEmpty(policy.getExcludeUrlsForProject().toList())
    }
}
