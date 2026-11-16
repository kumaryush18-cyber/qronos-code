package ai.qronos.client.agentManager.worktree

import ai.qronos.rpc.dto.GhAvailability
import com.intellij.util.messages.Topic

fun interface GhStatusListener {
    fun statusChanged(value: GhAvailability)

    companion object {
        @JvmField
        val TOPIC: Topic<GhStatusListener> = Topic.create("Qronos gh status", GhStatusListener::class.java)
    }
}
