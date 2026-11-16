package ai.qronos.client.actions

import com.intellij.openapi.actionSystem.ActionPlaces

internal object QronosActionPlaces {
    const val CONNECTION_RETRY = "Qronos.ConnectionRetry"

    fun connectionRetryPopup() = ActionPlaces.getActionGroupPopupPlace(CONNECTION_RETRY)
}
