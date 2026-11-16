package ai.qronos.client.session.controller

import ai.qronos.client.testing.TestLog
import ai.qronos.rpc.dto.ConfigDto
import ai.qronos.rpc.dto.QronosAppStateDto
import ai.qronos.rpc.dto.QronosAppStatusDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.flow

class SessionSubscriptionTest : SessionControllerTestBase() {

    override fun setUp() {
        super.setUp()
        rpc.session = rpc.session.copy(id = "ses_test")
        appRpc.state.value = QronosAppStateDto(QronosAppStatusDto.READY, config = ConfigDto(model = "qronos/gpt-5"))
        projectRpc.state.value = workspaceReady()
    }

    fun `test controller event subscription logs failures`() {
        val log = TestLog()
        rpc.eventFlow = { _, _ -> flow { throw IllegalStateException("stream failed") } }

        controller("ses_test", log = log)
        flush()

        assertTrue(log.messages.joinToString("\n"), log.messages.any { it.contains("kind=subscription route=controller-events failed message=stream failed") })
    }

    fun `test controller event subscription rethrows cancellation without failure log`() {
        val log = TestLog()
        rpc.eventFlow = { _, _ -> flow { throw CancellationException("stop") } }

        controller("ses_test", log = log)
        flush()

        assertFalse(log.messages.joinToString("\n"), log.messages.any { it.contains("route=controller-events failed") })
    }
}
