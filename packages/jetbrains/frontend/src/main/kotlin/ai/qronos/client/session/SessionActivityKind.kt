package ai.qronos.client.session

import ai.qronos.client.plugin.QronosBundle
import ai.qronos.client.ui.UiStyle
import ai.qronos.rpc.dto.SessionActivityKindDto
import javax.swing.Icon

enum class SessionActivityKind {
    RUNNING,
    LOGIN_REQUIRED,
    PERMISSION,
    PLAN,
    QUESTION,
    ERROR,
    ;

    fun label(): String = when (this) {
        RUNNING -> QronosBundle.message("session.part.tool.running")
        LOGIN_REQUIRED -> QronosBundle.message("history.badge.loginRequired")
        PERMISSION -> QronosBundle.message("history.badge.permission")
        PLAN -> QronosBundle.message("history.badge.plan")
        QUESTION -> QronosBundle.message("history.badge.question")
        ERROR -> QronosBundle.message("history.badge.error")
    }

    fun style(): UiStyle.Badge.Style = when (this) {
        RUNNING -> UiStyle.Badge.ActivityRunning
        LOGIN_REQUIRED, PERMISSION, PLAN, QUESTION -> UiStyle.Badge.ActivityAttention
        ERROR -> UiStyle.Badge.ActivityError
    }

    fun icon(): Icon = ActivityIcon.of(this)

    /**
     * Whether the session's turn is still in flight, as
     * [ai.qronos.client.session.model.SessionState.isBusy] answers it for the open session: running,
     * or stopped on a question or a permission it is waiting to be answered. A failed turn and a
     * login prompt are not -- the session is idle, waiting on the user to start something new -- so
     * the chat dock keeps offering its actions for those, and so does the session list.
     */
    fun busy(): Boolean = when (this) {
        RUNNING, PERMISSION, PLAN, QUESTION -> true
        LOGIN_REQUIRED, ERROR -> false
    }
}

/**
 * The backend reports activity for every session it knows, open or not. LOGIN_REQUIRED has no DTO
 * counterpart: it comes from live session UI state instead.
 */
internal fun SessionActivityKindDto.toKind(): SessionActivityKind = when (this) {
    SessionActivityKindDto.RUNNING -> SessionActivityKind.RUNNING
    SessionActivityKindDto.QUESTION -> SessionActivityKind.QUESTION
    SessionActivityKindDto.PLAN -> SessionActivityKind.PLAN
    SessionActivityKindDto.PERMISSION -> SessionActivityKind.PERMISSION
    SessionActivityKindDto.ERROR -> SessionActivityKind.ERROR
}
