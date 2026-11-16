package ai.qronos.client.vfs

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.APP)
class QronosEditorKindRegistry {
    private val kinds = ConcurrentHashMap<String, QronosEditorKind>()

    fun register(kind: QronosEditorKind) {
        kinds[kind.id] = kind
        service<QronosVirtualFileKindRegistry>().register(kind)
    }

    fun unregister(id: String) {
        kinds.remove(id)
        service<QronosVirtualFileKindRegistry>().unregister(id)
    }

    fun clear() {
        kinds.keys.forEach { id -> unregister(id) }
    }

    fun get(id: String): QronosEditorKind? = kinds[id]
}
