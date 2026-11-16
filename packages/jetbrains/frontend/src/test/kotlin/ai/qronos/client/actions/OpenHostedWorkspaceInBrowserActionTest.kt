package ai.qronos.client.actions

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.testing.PluginDescriptor
import ai.qronos.client.testing.attribute
import ai.qronos.client.testing.elements
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import org.w3c.dom.Element

class OpenHostedWorkspaceInBrowserActionTest : BasePlatformTestCase() {
    companion object {
        private const val ID = "Qronos.HostedWorkspace.OpenInBrowser"
        private const val REMOVE_ID = "Qronos.HostedWorkspace.Remove"
    }

    fun `test cloud workspace opens the browser chat for its worktree`() {
        assertEquals(
            "https://app.qronos.me/cloud/chat?worktreeId=worktree_123",
            hostedWorkspaceBrowserUrl(HostedWorkspaceRefDto("cloud", "worktree_123")),
        )
        assertEquals(
            "https://app.qronos.me/organizations/org_456/cloud/chat?worktreeId=worktree_123&sessionId=ses_789",
            hostedWorkspaceBrowserUrl(HostedWorkspaceRefDto("cloud", "worktree_123"), "org_456", "ses_789"),
        )
    }

    fun `test action is registered in the row menu with localized strings`() {
        val descriptor = PluginDescriptor.frontend()
        val declared = descriptor.elements("action").single { it.attribute("id") == ID }

        assertEquals(HostedOpenInBrowserAction::class.java.name, declared.attribute("class"))
        assertNull(declared.attribute("text"))
        assertNull(declared.attribute("description"))
        assertTrue(descriptor.elements("reference").any {
            it.attribute("ref") == ID && (it.parentNode as? Element)?.attribute("id") == "Qronos.Worktree.RowMenu"
        })
        assertEquals("Open in Browser", QronosBundle.optional("action.$ID.text"))
        assertFalse(QronosBundle.optional("action.$ID.description").isNullOrBlank())
    }

    fun `test remove from ide action is gone`() {
        val descriptor = PluginDescriptor.frontend()

        assertTrue(descriptor.elements("action").none { it.attribute("id") == REMOVE_ID })
        assertTrue(descriptor.elements("reference").none { it.attribute("ref") == REMOVE_ID })
        assertNull(QronosBundle.optional("action.$REMOVE_ID.text"))
        assertNull(QronosBundle.optional("action.$REMOVE_ID.description"))
    }
}
