package ai.qronos.client.session.context

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Caches the compiled [QronosIgnore] per workspace-root directory so editor-context
 * gathering does not re-read and re-compile the ignore files on every prompt.
 *
 * The compiled matcher is reused until a `.qronosignore` or `.gitignore` change
 * invalidates it via a VFS listener. This keeps the blocking VFS read (a remote `cwm`
 * round-trip in split mode) off the prompt-send path after the first prompt, instead of
 * repeating it for every message the user sends.
 */
@Service(Service.Level.PROJECT)
internal class QronosIgnoreCache : Disposable {
    private val cache = ConcurrentHashMap<String, QronosIgnore>()

    init {
        ApplicationManager.getApplication().messageBus.connect(this)
            .subscribe(VirtualFileManager.VFS_CHANGES, object : BulkFileListener {
                override fun after(events: List<VFileEvent>) {
                    if (events.any { relevant(it) }) cache.clear()
                }
            })
    }

    /** Returns the cached matcher for [root], compiling and caching it on first use. */
    suspend fun matcher(root: VirtualFile?): QronosIgnore {
        if (root == null) return QronosIgnore.EMPTY
        cache[root.url]?.let { return it }
        return withContext(Dispatchers.IO) {
            cache.getOrPut(root.url) { QronosIgnore.load(root) }
        }
    }

    override fun dispose() = cache.clear()

    private fun relevant(event: VFileEvent): Boolean {
        val name = event.path.substringAfterLast('/')
        return name == QronosIgnore.QRONOS || name == QronosIgnore.GIT
    }
}
