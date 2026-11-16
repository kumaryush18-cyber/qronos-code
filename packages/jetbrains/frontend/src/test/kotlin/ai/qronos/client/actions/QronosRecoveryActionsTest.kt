package ai.qronos.client.actions

import ai.qronos.client.agentManager.worktree.WorktreeDataKeys
import ai.qronos.client.agentManager.hosted.HostedWorkspaceDataKeys
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import ai.qronos.client.app.QronosAppService
import ai.qronos.client.app.QronosHostedService
import ai.qronos.client.app.QronosWorkspaceService
import ai.qronos.client.app.Workspace
import ai.qronos.client.session.SessionManager
import ai.qronos.client.settings.QronosSettingsSelection
import ai.qronos.client.settings.marketplace.MarketplaceConfigurable
import ai.qronos.client.testing.FakeAppRpcApi
import ai.qronos.client.testing.FakeWorkspaceRpcApi
import ai.qronos.client.testing.TestLog
import ai.qronos.rpc.dto.ConfigTargetDto
import ai.qronos.rpc.dto.QronosWorkspaceStateDto
import ai.qronos.rpc.dto.QronosWorkspaceStatusDto
import ai.qronos.rpc.dto.SetupScriptTargetDto
import ai.qronos.rpc.dto.WorktreeDto
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.Presentation
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.TestDialog
import com.intellij.openapi.ui.TestDialogManager
import com.intellij.testFramework.replaceService
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull

@Suppress("UnstableApiUsage")
class QronosRecoveryActionsTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var rpc: FakeWorkspaceRpcApi
    private lateinit var appRpc: FakeAppRpcApi

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        rpc = FakeWorkspaceRpcApi()
        appRpc = FakeAppRpcApi()
        ApplicationManager.getApplication().replaceService(
            QronosAppService::class.java,
            QronosAppService(scope, appRpc),
            testRootDisposable,
        )
        ApplicationManager.getApplication().replaceService(
            QronosWorkspaceService::class.java,
            QronosWorkspaceService(scope, rpc),
            testRootDisposable,
        )
    }

    override fun tearDown() {
        try {
            TestDialogManager.setTestDialog(TestDialog.DEFAULT)
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test restart action stays enabled for all app states`() {
        val action = RestartQronosAction()
        val event = event(action)

        update(action, event)

        assertTrue("Restart should force-enable recovery action", event.presentation.isEnabled)
    }

    fun `test reinstall action stays enabled for all app states`() {
        val action = ReinstallQronosAction()
        val event = event(action)

        update(action, event)

        assertTrue("Reinstall should force-enable recovery action", event.presentation.isEnabled)
    }

    fun `test restart warns before cancelling active sessions`() {
        val action = RestartQronosAction()
        val notices = mutableListOf<String>()
        TestDialogManager.setTestDialog { message ->
            notices.add(message)
            Messages.NO
        }

        action.actionPerformed(event(action))

        assertEquals(0, appRpc.restarts)
        assertTrue(notices.single().contains("cancel all active sessions"))

        TestDialogManager.setTestDialog(TestDialog.YES)
        action.actionPerformed(event(action))
        runBlocking {
            withTimeout(5_000) {
                while (appRpc.restarts == 0) delay(5)
            }
        }
        assertEquals(1, appRpc.restarts)
    }

    fun `test reinstall warns before cancelling active sessions`() {
        val action = ReinstallQronosAction()
        val notices = mutableListOf<String>()
        TestDialogManager.setTestDialog { message ->
            notices.add(message)
            Messages.NO
        }

        action.actionPerformed(event(action))

        assertEquals(0, appRpc.reinstalls)
        assertTrue(notices.single().contains("cancel all active sessions"))

        TestDialogManager.setTestDialog(TestDialog.YES)
        action.actionPerformed(event(action))
        runBlocking {
            withTimeout(5_000) {
                while (appRpc.reinstalls == 0) delay(5)
            }
        }
        assertEquals(1, appRpc.reinstalls)
    }

    fun `test reload core settings action requires and uses the current workspace`() {
        val action = ReloadCoreSettingsAction()
        val missing = event(action)
        update(action, missing)
        assertFalse(missing.presentation.isEnabled)

        val active = event(action, workspace("/test worktree"))
        update(action, active)
        assertTrue(active.presentation.isEnabled)

        action.actionPerformed(active)
        runBlocking {
            withTimeout(5_000) {
                while (rpc.coreReloads.isEmpty()) delay(5)
            }
        }
        assertEquals(listOf("/test worktree"), rpc.coreReloads.toList())
    }

    fun `test restart action adds core suffix in connection retry popup`() {
        val action = RestartQronosAction()
        val event = event(action, place = QronosActionPlaces.connectionRetryPopup())

        update(action, event)

        assertEquals("Restart Core", event.presentation.text)
    }

    fun `test refresh cloud uses the current workspace off the UI thread without restarting core`() {
        val resolved = CompletableDeferred<Pair<String, Boolean>>()
        val hosted = QronosHostedService(
            cs = scope,
            rpc = null,
            log = TestLog(),
            repo = { dir ->
                resolved.complete(dir to ApplicationManager.getApplication().isDispatchThread)
                null
            },
        )
        project.replaceService(QronosHostedService::class.java, hosted, testRootDisposable)
        assertTrue("Cloud discovery must be enabled by default", hosted.enabled())
        val action = RefreshCloudAction()
        val missing = event(action)
        update(action, missing)
        assertFalse(missing.presentation.isEnabled)
        val active = event(action, workspace("/test cloud"))
        update(action, active)
        assertTrue(active.presentation.isEnabled)

        action.actionPerformed(active)

        val result = runBlocking { withTimeout(5_000) { resolved.await() } }
        assertEquals("/test cloud" to false, result)
        assertEquals(1L, hosted.refreshes.value)
        assertEquals(0, appRpc.restarts)
        assertEquals(0, appRpc.reinstalls)
    }

    fun `test reinstall action adds core suffix in connection retry popup`() {
        val action = ReinstallQronosAction()
        val event = event(action, place = QronosActionPlaces.connectionRetryPopup())

        update(action, event)

        assertEquals("Reinstall Core", event.presentation.text)
    }

    fun `test core group separates reload from recovery actions`() {
        val xml = requireNotNull(javaClass.classLoader.getResourceAsStream("qronos.jetbrains.frontend.xml"))
            .bufferedReader()
            .use { it.readText() }

        assertTrue(xml.contains("<group id=\"Qronos.CliGroup\" text=\"Core\" popup=\"true\">"))
        val reload = xml.indexOf("<reference ref=\"Qronos.ReloadCoreSettings\"/>")
        val cloud = xml.indexOf("<reference ref=\"Qronos.RefreshCloud\"/>")
        val restart = xml.indexOf("<reference ref=\"Qronos.Restart\"/>")
        assertTrue(reload < cloud && cloud < restart)
        assertTrue(xml.substring(reload, restart).contains("<separator/>"))
        assertTrue(xml.contains("<reference ref=\"Qronos.Restart\"/>"))
        assertTrue(xml.contains("<reference ref=\"Qronos.Reinstall\"/>"))
        assertTrue(xml.contains("<reference ref=\"Qronos.CoreInfo\"/>"))
        assertTrue(xml.contains("<group id=\"Qronos.OpenConfigGroup\" text=\"Config Files\" popup=\"true\">"))
        assertTrue(xml.contains("<reference ref=\"Qronos.OpenConfigGroup\"/>"))
        assertFalse(xml.contains("<action id=\"Qronos.ShowProfile\""))
        assertFalse(xml.contains("<reference ref=\"Qronos.ShowProfile\"/>"))

        // The setup-script action lives only in the worktree row menu, not the tool-window popup.
        val settingsGroupStart = xml.indexOf("<group id=\"Qronos.SettingsGroup\">")
        val settingsGroupEnd = xml.indexOf("</group>", settingsGroupStart)
        assertFalse(xml.substring(settingsGroupStart, settingsGroupEnd).contains("Qronos.OpenSetupScript"))
    }

    fun `test settings menu offers page shortcuts between open settings and the config groups`() {
        val xml = requireNotNull(javaClass.classLoader.getResourceAsStream("qronos.jetbrains.frontend.xml"))
            .bufferedReader()
            .use { it.readText() }
        val start = xml.indexOf("<group id=\"Qronos.SettingsGroup\">")
        val group = xml.substring(start, xml.indexOf("</group>", start))

        val order = Regex("<separator\\s*/>|<reference\\s+ref=\"([^\"]+)\"\\s*/>")
            .findAll(group)
            .map { it.groupValues[1].ifEmpty { "---" } }
            .toList()

        assertEquals(
            listOf(
                "Qronos.OpenSettings",
                "---",
                "Qronos.OpenUserProfileSettings",
                "Qronos.OpenMarketplaceSettings",
                "---",
                "Qronos.OpenConfigGroup",
                "---",
                "Qronos.CliGroup",
            ),
            order,
        )
        assertTrue(xml.contains("<action id=\"Qronos.OpenUserProfileSettings\""))
        assertTrue(xml.contains("<action id=\"Qronos.OpenMarketplaceSettings\""))
    }

    fun `test settings shortcuts target their own pages while open settings resumes the last one`() {
        assertEquals("ai.qronos.jetbrains.settings.profile", page(OpenUserProfileSettingsAction()))
        assertEquals("ai.qronos.jetbrains.settings.marketplace", page(OpenMarketplaceSettingsAction()))
        // Nothing visited yet, so the resuming entry falls back to the profile page.
        assertEquals("ai.qronos.jetbrains.settings.profile", page(OpenSettingsAction()))

        // Restored afterwards: this is project-wide state other tests read too.
        val props = PropertiesComponent.getInstance(project)
        val previous = props.getValue(QronosSettingsSelection.SELECTED_CONFIGURABLE_KEY)
        props.setValue(QronosSettingsSelection.SELECTED_CONFIGURABLE_KEY, MarketplaceConfigurable.ID)
        try {
            assertEquals(MarketplaceConfigurable.ID, page(OpenSettingsAction()))
            // A shortcut still goes to its own page regardless of where the user last was.
            assertEquals("ai.qronos.jetbrains.settings.profile", page(OpenUserProfileSettingsAction()))
        } finally {
            props.setValue(QronosSettingsSelection.SELECTED_CONFIGURABLE_KEY, previous)
        }
    }

    fun `test settings shortcuts have menu text and resolve their page off the EDT`() {
        for (action in listOf(OpenUserProfileSettingsAction(), OpenMarketplaceSettingsAction(), OpenSettingsAction())) {
            // Resolving the page reads project state, so it must not be forced onto the EDT.
            assertEquals(action.javaClass.simpleName, ActionUpdateThread.BGT, action.actionUpdateThread)
        }
        assertEquals("User Profile...", event(OpenUserProfileSettingsAction()).presentation.text)
        assertEquals("Marketplace...", event(OpenMarketplaceSettingsAction()).presentation.text)
        assertEquals("Open Settings...", event(OpenSettingsAction()).presentation.text)
    }

    /** Passes a workspace so the data context carries the project the action reads state from. */
    private fun page(action: OpenSettingsPageAction): String =
        action.page(event(action, workspace("/tmp/qronos-settings-shortcuts")))

    fun `test core info action shows version and architecture`() {
        appRpc.cliVersion = "1.2.3"
        appRpc.cliPlatform = "darwin-arm64"
        ApplicationManager.getApplication().executeOnPooledThread {
            runBlocking { app().coreInfo() }
        }.get()
        val action = CoreInfoAction()
        val event = event(action)

        update(action, event)

        assertFalse(event.presentation.isEnabled)
        assertTrue(event.presentation.isVisible)
        assertEquals("Core v1.2.3 • Architecture: darwin-arm64", event.presentation.text)
    }

    fun `test core info action marks bundled core`() {
        appRpc.cliVersion = "1.2.3"
        appRpc.cliPlatform = "darwin-arm64"
        appRpc.cliBundled = true
        ApplicationManager.getApplication().executeOnPooledThread {
            runBlocking { app().coreInfo() }
        }.get()
        val action = CoreInfoAction()
        val event = event(action)

        update(action, event)

        assertEquals("Bundled Core v1.2.3 • Architecture: darwin-arm64", event.presentation.text)
    }

    fun `test local config action says open when target exists`() {
        rpc.localConfigPath = "/test/.qronos/qronos.jsonc"
        rpc.localConfigDisplayPath = "~/.qronos/qronos.jsonc"
        rpc.localConfigExists = true
        service().localConfig["/test"] = ConfigTargetDto("/test/.qronos/qronos.jsonc", "~/.qronos/qronos.jsonc", true)
        val action = OpenLocalConfigAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabled)
        assertEquals("Open: local ~/.qronos/qronos.jsonc", event.presentation.text)
        assertEquals(0, rpc.localConfigPathCalls)
    }

    fun `test local config action says create when target is missing`() {
        rpc.localConfigPath = "/test/.qronos/qronos.jsonc"
        rpc.localConfigDisplayPath = "~/.qronos/qronos.jsonc"
        rpc.localConfigExists = false
        service().localConfig["/test"] = ConfigTargetDto("/test/.qronos/qronos.jsonc", "~/.qronos/qronos.jsonc", false)
        val action = OpenLocalConfigAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabled)
        assertEquals("Create: local ~/.qronos/qronos.jsonc", event.presentation.text)
        assertEquals(0, rpc.localConfigPathCalls)
    }

    fun `test local config action refreshes missing target in background`() {
        rpc.localConfigPath = "/test/.qronos/qronos.jsonc"
        rpc.localConfigDisplayPath = "/test/.qronos/qronos.jsonc"
        rpc.localConfigExists = true
        val call = CompletableDeferred<Unit>()
        val gate = CompletableDeferred<Unit>()
        rpc.beforeLocalConfigTarget = {
            call.complete(Unit)
            gate.await()
        }
        val action = OpenLocalConfigAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabled)
        assertEquals("Open: local ...", event.presentation.text)
        await(call)
        assertEquals(1, rpc.localConfigPathCalls)

        gate.complete(Unit)
        service().localConfig["/test"] = ConfigTargetDto("/test/.qronos/qronos.jsonc", "/test/.qronos/qronos.jsonc", true)

        val next = event(action, workspace = workspace("/test"))
        update(action, next)

        assertEquals("Open: local /test/.qronos/qronos.jsonc", next.presentation.text)
    }

    fun `test local config action dedupes in flight refresh`() {
        val gate = CompletableDeferred<Unit>()
        val call = CompletableDeferred<Unit>()
        val action = OpenLocalConfigAction()
        rpc.beforeLocalConfigTarget = {
            call.complete(Unit)
            gate.await()
        }

        update(action, event(action, workspace = workspace("/test")))
        await(call)
        update(action, event(action, workspace = workspace("/test")))

        assertEquals(1, rpc.localConfigPathCalls)

        gate.complete(Unit)
    }

    fun `test global config action says open when target exists`() {
        rpc.globalConfigPath = "/config/qronos.jsonc"
        rpc.globalConfigDisplayPath = "~/.config/qronos/qronos.jsonc"
        rpc.globalConfigExists = true
        cacheGlobal(ConfigTargetDto("/config/qronos.jsonc", "~/.config/qronos/qronos.jsonc", true))
        val action = OpenGlobalConfigAction()
        val event = event(action)

        update(action, event)

        assertEquals("Open: global ~/.config/qronos/qronos.jsonc", event.presentation.text)
        assertEquals(0, rpc.globalConfigPathCalls)
    }

    fun `test global config action says create when target is missing`() {
        rpc.globalConfigPath = "/config/qronos.jsonc"
        rpc.globalConfigDisplayPath = "~/.config/qronos/qronos.jsonc"
        rpc.globalConfigExists = false
        cacheGlobal(ConfigTargetDto("/config/qronos.jsonc", "~/.config/qronos/qronos.jsonc", false))
        val action = OpenGlobalConfigAction()
        val event = event(action)

        update(action, event)

        assertEquals("Create: global ~/.config/qronos/qronos.jsonc", event.presentation.text)
        assertEquals(0, rpc.globalConfigPathCalls)
    }

    fun `test global config action refreshes missing target in background`() {
        rpc.globalConfigPath = "/config/qronos.jsonc"
        rpc.globalConfigDisplayPath = "/config/qronos.jsonc"
        rpc.globalConfigExists = true
        val call = CompletableDeferred<Unit>()
        val gate = CompletableDeferred<Unit>()
        rpc.beforeGlobalConfigTarget = {
            call.complete(Unit)
            gate.await()
        }
        val action = OpenGlobalConfigAction()
        val event = event(action)

        update(action, event)

        assertEquals("Open: global ...", event.presentation.text)
        await(call)
        assertEquals(1, rpc.globalConfigPathCalls)

        gate.complete(Unit)
        cacheGlobal(ConfigTargetDto("/config/qronos.jsonc", "/config/qronos.jsonc", true))

        val next = event(action)
        update(action, next)

        assertEquals("Open: global /config/qronos.jsonc", next.presentation.text)
    }

    fun `test global config action dedupes in flight refresh`() {
        val gate = CompletableDeferred<Unit>()
        val call = CompletableDeferred<Unit>()
        rpc.beforeGlobalConfigTarget = {
            call.complete(Unit)
            gate.await()
        }
        val action = OpenGlobalConfigAction()

        update(action, event(action))
        await(call)
        update(action, event(action))

        assertEquals(1, rpc.globalConfigPathCalls)

        gate.complete(Unit)
    }

    fun `test local config action disables without directory`() {
        val action = OpenLocalConfigAction()
        val event = event(action)

        update(action, event)

        assertFalse(event.presentation.isEnabled)
        assertEquals(0, rpc.localConfigPathCalls)
    }

    fun `test setup script action says open when target exists`() {
        rpc.setupScriptExists = true
        service().setupScript["/test"] = SetupScriptTargetDto("/test/.qronos/setup-script", "~/.qronos/setup-script", true)
        val action = OpenSetupScriptAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabledAndVisible)
        assertEquals("Show Worktree Setup", event.presentation.text)
        assertEquals(0, rpc.setupScriptTargetCalls.size)
    }

    fun `test setup script action says create when target is missing`() {
        rpc.setupScriptExists = false
        service().setupScript["/test"] = SetupScriptTargetDto("/test/.qronos/setup-script", "~/.qronos/setup-script", false)
        val action = OpenSetupScriptAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabledAndVisible)
        assertEquals("Create Worktree Setup", event.presentation.text)
        assertEquals(0, rpc.setupScriptTargetCalls.size)
    }

    fun `test setup script action refreshes missing target in background`() {
        rpc.setupScriptExists = true
        val call = CompletableDeferred<Unit>()
        val gate = CompletableDeferred<Unit>()
        rpc.beforeSetupScriptTarget = {
            call.complete(Unit)
            gate.await()
        }
        val action = OpenSetupScriptAction()
        val event = event(action, workspace = workspace("/test"))

        update(action, event)

        assertTrue(event.presentation.isEnabledAndVisible)
        // No cached target yet: defaults to the "Show" wording, same as a resolved existing script.
        assertEquals("Show Worktree Setup", event.presentation.text)
        await(call)
        assertEquals(1, rpc.setupScriptTargetCalls.size)

        // The fake reads setupScriptExists after the gate, so flipping it here makes the released
        // background lookup cache "missing" itself. Writing the cache from the test instead would
        // race that write and lose whenever the coroutine resumed first.
        rpc.setupScriptExists = false
        gate.complete(Unit)
        assertTrue("background refresh never cached the resolved target", cached("/test") { !it.exists })

        val next = event(action, workspace = workspace("/test"))
        update(action, next)

        assertEquals("Create Worktree Setup", next.presentation.text)
    }

    fun `test setup script action disables without directory`() {
        val action = OpenSetupScriptAction()
        val event = event(action)

        update(action, event)

        assertFalse(event.presentation.isEnabledAndVisible)
        assertEquals(0, rpc.setupScriptTargetCalls.size)
    }

    fun `test setup script action hides on the main worktree row`() {
        val action = OpenSetupScriptAction()
        val event = event(action, workspace = workspace("/test"), worktree = WorktreeDto("/test", "main", "main", "/test", main = true))

        update(action, event)

        assertFalse(event.presentation.isEnabledAndVisible)
    }

    fun `test setup script action never offers local setup for a cloud workspace`() {
        val action = OpenSetupScriptAction()
        val dto = HostedWorkspaceDto(HostedWorkspaceRefDto("cloud", "one"))
        val event = AnActionEvent.createFromDataContext("", action.templatePresentation.clone(), DataContext { id ->
            when {
                CommonDataKeys.PROJECT.`is`(id) -> project
                SessionManager.WORKSPACE_KEY.`is`(id) -> workspace("/test")
                HostedWorkspaceDataKeys.WORKSPACE.`is`(id) -> dto
                else -> null
            }
        })
        update(action, event)
        assertFalse(event.presentation.isEnabledAndVisible)
        action.actionPerformed(event)
        assertTrue(rpc.setupScriptTargetCalls.isEmpty())
    }

    fun `test setup script action visible on a non-main worktree row`() {
        rpc.setupScriptExists = true
        service().setupScript["/test"] = SetupScriptTargetDto("/test/.qronos/setup-script", "/test/.qronos/setup-script", true)
        val action = OpenSetupScriptAction()
        val event = event(
            action,
            workspace = workspace("/test"),
            worktree = WorktreeDto("/test/.qronos/worktrees/feature-x", "feature-x", "feature-x", "/test/.qronos/worktrees/feature-x"),
        )

        update(action, event)

        assertTrue(event.presentation.isEnabledAndVisible)
    }

    fun `test settings popup group updates recursively in background`() {
        val group = DefaultActionGroup()
        val wrapped = QronosSettingsAction.popupGroup(group)

        assertEquals(ActionUpdateThread.BGT, wrapped.actionUpdateThread)
    }

    fun `test settings action prewarms config targets`() {
        val action = QronosSettingsAction()

        runBlocking {
            QronosSettingsAction.refreshConfigTargets(event(action, workspace = workspace("/test")), service()).forEach { it.join() }
        }

        assertEquals(1, rpc.localConfigPathCalls)
        assertEquals(1, rpc.globalConfigPathCalls)
        assertEquals(0, rpc.setupScriptTargetCalls.size)
    }

    fun `test workspace creation prewarms config targets`() {
        val local = CompletableDeferred<Unit>()
        val global = CompletableDeferred<Unit>()
        rpc.beforeLocalConfigTarget = { local.complete(Unit) }
        rpc.beforeGlobalConfigTarget = { global.complete(Unit) }

        service().workspace("/test")

        await(local)
        await(global)
        assertEquals(1, rpc.localConfigPathCalls)
        assertEquals(1, rpc.globalConfigPathCalls)
    }

    private fun event(action: AnAction, workspace: Workspace? = null, place: String = "", worktree: WorktreeDto? = null): AnActionEvent {
        val presentation = Presentation().apply { copyFrom(action.templatePresentation) }
        presentation.isEnabled = false
        return AnActionEvent.createFromDataContext(place, presentation, context(workspace, worktree))
    }

    private fun update(action: AnAction, event: AnActionEvent) {
        ApplicationManager.getApplication().executeOnPooledThread {
            ActionUtil.updateAction(action, event)
        }.get()
    }

    private fun await(signal: CompletableDeferred<Unit>) = runBlocking {
        withTimeout(5_000) { signal.await() }
    }

    /** Waits for the background setup-script lookup to publish a target matching [want]. */
    private fun cached(dir: String, want: (SetupScriptTargetDto) -> Boolean): Boolean = runBlocking {
        withTimeoutOrNull(5_000) {
            while (service().setupScript[dir]?.let(want) != true) delay(5)
            true
        } == true
    }

    private fun service(): QronosWorkspaceService = ApplicationManager.getApplication().getService(QronosWorkspaceService::class.java)

    private fun app(): QronosAppService = ApplicationManager.getApplication().getService(QronosAppService::class.java)

    private fun cacheGlobal(target: ConfigTargetDto) {
        val field = QronosWorkspaceService::class.java.getDeclaredField("globalConfig")
        field.isAccessible = true
        field.set(service(), target)
    }

    private fun context(workspace: Workspace?, worktree: WorktreeDto? = null): DataContext {
        return DataContext { id ->
            when (id) {
                SessionManager.WORKSPACE_KEY.name -> workspace
                CommonDataKeys.PROJECT.name -> project.takeIf { workspace != null }
                WorktreeDataKeys.WORKTREE.name -> worktree
                else -> null
            }
        }
    }

    private fun workspace(dir: String): Workspace {
        return Workspace(
            dir,
            MutableStateFlow(QronosWorkspaceStateDto(QronosWorkspaceStatusDto.READY)),
            reload = {},
            refreshConfigFiles = {},
        )
    }
}
