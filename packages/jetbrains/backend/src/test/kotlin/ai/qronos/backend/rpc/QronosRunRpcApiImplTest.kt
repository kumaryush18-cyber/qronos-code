package ai.qronos.backend.rpc

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class QronosRunRpcApiImplTest : BasePlatformTestCase() {
    fun testResolvesProjectByDirectory() = runBlocking {
        val api = QronosRunRpcApiImpl()
        val dir = requireNotNull(project.basePath)
        assertNull(api.configs(dir).error)
        // A trailing slash must resolve the same project the workspace API would.
        assertNull(api.configs("$dir/").error)
        assertNotNull(api.configs("/qronos/definitely/missing").error)
        assertNotNull(api.run("/qronos/definitely/missing", "id", "/wt").error)
        assertNotNull(api.build("/qronos/definitely/missing", "/wt", false).error)
        assertFalse(api.stop("/qronos/definitely/missing", "id", "/wt"))
        assertFalse(api.focus("/qronos/definitely/missing", "id", "/wt"))
        assertFalse(api.release("/qronos/definitely/missing", "/wt"))
        // States for an unresolved project degrade to an empty list instead of failing the stream.
        assertTrue(api.states("/qronos/definitely/missing").first().isEmpty())
    }
}
