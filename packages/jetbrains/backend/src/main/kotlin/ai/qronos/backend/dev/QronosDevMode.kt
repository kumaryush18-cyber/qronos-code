package ai.qronos.backend.dev

import ai.qronos.log.QronosLog

object QronosDevMode {
    fun enabled(): Boolean = QronosLog.sandbox()
}
