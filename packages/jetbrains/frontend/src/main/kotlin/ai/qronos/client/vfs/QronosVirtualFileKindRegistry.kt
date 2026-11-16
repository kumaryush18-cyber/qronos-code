package ai.qronos.client.vfs

import com.intellij.openapi.components.Service
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.APP)
class QronosVirtualFileKindRegistry {
    private val kinds = ConcurrentHashMap<String, QronosVirtualFileKind>()

    fun register(kind: QronosVirtualFileKind) {
        kinds[kind.id] = kind
    }

    fun unregister(id: String) {
        kinds.remove(id)
    }

    fun clear() {
        kinds.clear()
    }

    fun get(id: String): QronosVirtualFileKind? = kinds[id]
}
