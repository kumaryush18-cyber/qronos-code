package ai.qronos.client.ui.list

import ai.qronos.client.agentManager.hosted.HostedWorkspaceDataKeys
import ai.qronos.client.agentManager.hosted.HostedWorkspaceRow
import ai.qronos.client.agentManager.hosted.HostedWorkspaceRowData
import ai.qronos.client.agentManager.worktree.WorktreeDataKeys
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import ai.qronos.rpc.dto.WorktreeDto
import ai.qronos.client.ui.active.ActiveItem
import ai.qronos.client.ui.active.ActiveMenu
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import javax.swing.JPanel

class ActiveListMenuTest : BasePlatformTestCase() {
    fun `test local and cloud popup contexts contain only their own typed workspace`() {
        val dto = WorktreeDto("local", "/repo/local", "Local", "main", false)
        val local = object : ActiveItem {
            override val key = dto.id
            override val title = dto.name
            override val search = dto.name
        }
        val hosted = HostedWorkspaceDto(HostedWorkspaceRefDto("cloud", "one"))
        val cloud = HostedWorkspaceRow(HostedWorkspaceRowData(hosted, null))
        val group = DefaultActionGroup()
        val menu = ActiveMenu(WorktreeDataKeys.WORKTREE, group, element = { row -> dto.takeIf { row === local } },
            alternate = ActiveMenu(HostedWorkspaceDataKeys.WORKSPACE, group, element = { row ->
                (row as? HostedWorkspaceRow)?.data?.dto
            }))
        val anchor = JPanel()
        assertTrue(menu.available(local))
        assertTrue(menu.available(cloud))
        val one = menu.context(anchor, local)
        assertTrue(one is SimpleDataContext)
        assertSame(dto, WorktreeDataKeys.WORKTREE.getData(one))
        assertNull(HostedWorkspaceDataKeys.WORKSPACE.getData(one))
        val two = menu.context(anchor, cloud)
        assertTrue(two is SimpleDataContext)
        assertSame(hosted, HostedWorkspaceDataKeys.WORKSPACE.getData(two))
        assertNull(WorktreeDataKeys.WORKTREE.getData(two))
    }
}
