package ai.qronos.backend.rpc

import ai.qronos.backend.workspace.QronosWorktreeIndexSettings
import kotlinx.coroutines.runBlocking
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class QronosAppRpcApiImplIndexWorktreesTest {

    @AfterTest
    fun tearDown() {
        QronosWorktreeIndexSettings.set(false)
    }

    @Test
    fun `indexWorktrees reflects persisted setting`() = runBlocking {
        val impl = QronosAppRpcApiImpl()

        assertFalse(impl.indexWorktrees())

        impl.setIndexWorktrees(true)

        assertTrue(impl.indexWorktrees())
        assertEquals(true, QronosWorktreeIndexSettings.get())
    }

    @Test
    fun `setIndexWorktrees is idempotent for an unchanged value`() = runBlocking {
        val impl = QronosAppRpcApiImpl()

        impl.setIndexWorktrees(false)

        assertFalse(impl.indexWorktrees())
    }
}
