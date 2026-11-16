@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.rpc.QronosSessionRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class QronosSessionRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<QronosSessionRpcApi>()) {
            QronosSessionRpcApiImpl()
        }
    }
}
