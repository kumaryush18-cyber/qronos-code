@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.rpc.QronosProviderRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class QronosProviderRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<QronosProviderRpcApi>()) {
            QronosProviderRpcApiImpl()
        }
    }
}
