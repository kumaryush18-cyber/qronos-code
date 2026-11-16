@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.rpc.QronosAppRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class QronosAppRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<QronosAppRpcApi>()) {
            QronosAppRpcApiImpl()
        }
    }
}
