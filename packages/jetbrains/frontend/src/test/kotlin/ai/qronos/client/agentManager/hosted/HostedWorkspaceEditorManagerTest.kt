package ai.qronos.client.agentManager.hosted

import ai.qronos.client.app.QronosHostedService
import ai.qronos.client.session.SessionHost
import ai.qronos.client.session.SessionRef
import ai.qronos.client.session.SessionUiFactory
import ai.qronos.client.testing.TestLog
import ai.qronos.rpc.QronosHostedRpcApi
import ai.qronos.rpc.dto.HostedCreateWorkspaceDto
import ai.qronos.rpc.dto.HostedDeleteResultDto
import ai.qronos.rpc.dto.HostedIDs
import ai.qronos.rpc.dto.HostedMutationResultDto
import ai.qronos.rpc.dto.HostedProfileDefaultDto
import ai.qronos.rpc.dto.HostedProviderDto
import ai.qronos.rpc.dto.HostedStartSessionDto
import ai.qronos.rpc.dto.HostedSystemEventDto
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceListDto
import ai.qronos.rpc.dto.HostedWorkspaceProfileListDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import ai.qronos.rpc.dto.HostedWorkspaceSessionDto
import ai.qronos.rpc.dto.HostedWorkspaceStatusDto
import ai.qronos.rpc.dto.PromptDto
import ai.qronos.rpc.dto.PromptPartDto
import com.intellij.openapi.components.service
import com.intellij.openapi.util.Disposer
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.replaceService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking

/**
 * The blank New Session panel hands its first prompt to [HostedWorkspaceEditorManager.createSession],
 * which must turn it into exactly the Cloud start request the former dialog used to build: prompt
 * text plus agent/model, nothing about branches or profiles.
 */
class HostedWorkspaceEditorManagerTest : BasePlatformTestCase() {
    private val ref = HostedWorkspaceRefDto("qronos-cloud", "worktree_1")
    private val cs = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var rpc: RecordingHosted
    private lateinit var manager: HostedWorkspaceEditorManager

    override fun setUp() {
        super.setUp()
        rpc = RecordingHosted(ref)
        project.replaceService(
            QronosHostedService::class.java,
            QronosHostedService(cs, rpc, gate = { true }, log = TestLog(), repo = { "repo" }),
            testRootDisposable,
        )
        manager = HostedWorkspaceEditorManager(testRootDisposable, project, hostedWorkspaceRoot(project), ref)
    }

    override fun tearDown() {
        try {
            cs.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test first prompt becomes one Cloud start request with agent and model only`() {
        val prompt = PromptDto(
            parts = listOf(PromptPartDto("text", text = "tell me about microsoft")),
            messageID = "msg_first",
            providerID = "qronos",
            modelID = "anthropic/claude-opus-5.5",
            agent = "code",
        )

        val created = runBlocking { manager.createSession(prompt) }

        val request = rpc.starts.single()
        assertEquals(ref, request.first)
        assertEquals("tell me about microsoft", request.second.prompt)
        assertEquals("code", request.second.agent.mode)
        assertEquals("qronos/anthropic/claude-opus-5.5", request.second.agent.model)
        assertNull(request.second.agent.variant)
        assertEquals("msg_first", request.second.messageID)
        assertTrue(request.second.operationKey.isNotBlank())
        assertEquals(SessionRef.Hosted(ref.providerID, ref.workspaceID, "ses_new", "New session"), created)
        // The start call already carried the prompt; the editor seeds it instead of sending again.
        val seeded = project.service<QronosHostedService>().takePrompt(rpc.session.id)
        assertEquals("msg_first", seeded?.messageID)
    }

    fun `test created session is announced only after the UI is registered under its ref`() {
        var announced: HostedWorkspaceSessionDto? = null
        manager.onCreated = { announced = it }
        val prompt = PromptDto(
            parts = listOf(PromptPartDto("text", text = "hello")),
            messageID = "msg_first",
            providerID = "qronos",
            modelID = "anthropic/claude-opus-5.5",
            agent = "code",
        )

        val created = runBlocking { manager.createSession(prompt) }
        assertNull("the panel must not open the session before the controller registered its UI", announced)

        // The same blank panel the user typed into is what the controller registers under the new ref.
        edt { manager.newSession() }
        assertEquals(SessionHost.NEW, edt { manager.currentKey() })
        val ui = edt {
            service<SessionUiFactory>().create(project, hostedWorkspaceRoot(project), manager, null)
        }
        try {
            edt { manager.sessionCreated(ui, created) }
            assertEquals(rpc.session, announced)
        } finally {
            edt { Disposer.dispose(ui) }
        }
    }

    fun `test a prompt without a Qronos model is rejected before any Cloud call`() {
        val prompt = PromptDto(parts = listOf(PromptPartDto("text", text = "hello")), agent = "code")

        val error = runCatching { runBlocking { manager.createSession(prompt) } }.exceptionOrNull()

        assertTrue(error is IllegalStateException)
        assertTrue(rpc.starts.isEmpty())
    }

    private fun <T> edt(block: () -> T): T {
        var result: T? = null
        com.intellij.openapi.application.ApplicationManager.getApplication().invokeAndWait { result = block() }
        @Suppress("UNCHECKED_CAST")
        return result as T
    }

    private class RecordingHosted(private val ref: HostedWorkspaceRefDto) : QronosHostedRpcApi {
        val starts = mutableListOf<Pair<HostedWorkspaceRefDto, HostedStartSessionDto>>()
        val session = HostedWorkspaceSessionDto(
            id = HostedIDs.session(ref.providerID, ref.workspaceID, "ses_new"),
            nativeSessionID = "ses_new",
            title = "New session",
            updated = 1.0,
        )

        override suspend fun providers(): List<HostedProviderDto> = emptyList()
        override suspend fun workspaces(repositoryUrl: String?, cursor: String?, organizationID: String?) =
            HostedWorkspaceListDto()
        override suspend fun workspace(ref: HostedWorkspaceRefDto, sessionCursor: String?, organizationID: String?) =
            HostedWorkspaceDto(ref)
        override suspend fun workspaceStatus(ref: HostedWorkspaceRefDto, organizationID: String?) =
            HostedWorkspaceStatusDto(ref, "active", "active", "sandbox_ready", 1.0)
        override suspend fun systemEvents(
            ref: HostedWorkspaceRefDto,
            sessionID: String,
            organizationID: String?,
        ): Flow<HostedSystemEventDto> = emptyFlow()
        override suspend fun workspaceProfiles(organizationID: String?) = HostedWorkspaceProfileListDto()
        override suspend fun setPersonalDefaultProfile(profileID: String) = HostedProfileDefaultDto(success = true)
        override suspend fun createWorkspace(request: HostedCreateWorkspaceDto) = HostedMutationResultDto()
        override suspend fun startWorkspaceSession(ref: HostedWorkspaceRefDto, request: HostedStartSessionDto): HostedMutationResultDto {
            starts += ref to request
            return HostedMutationResultDto(workspace = HostedWorkspaceDto(ref), session = session, messageID = request.messageID)
        }
        override suspend fun deleteWorkspace(ref: HostedWorkspaceRefDto, organizationID: String?) = HostedDeleteResultDto(ref)
    }
}