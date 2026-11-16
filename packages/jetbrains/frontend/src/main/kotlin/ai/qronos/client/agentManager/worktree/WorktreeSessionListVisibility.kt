package ai.qronos.client.agentManager.worktree

import ai.qronos.client.util.edt
import ai.qronos.log.QronosLog
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.APP)
internal class WorktreeSessionListVisibility(private val cs: CoroutineScope) {
    fun load(path: String, done: (Boolean?) -> Unit) {
        cs.launch {
            val value = service<QronosWorktreeService>().sessionList(path)
            edt { done(value) }
        }
    }

    fun save(path: String, visible: Boolean) {
        cs.launch {
            val ok = service<QronosWorktreeService>().setSessionList(path, visible)
            if (!ok) LOG.warn("worktree session list state write was not persisted: path=$path visible=$visible")
        }
    }

    private companion object {
        val LOG = QronosLog.create(WorktreeSessionListVisibility::class.java)
    }
}
