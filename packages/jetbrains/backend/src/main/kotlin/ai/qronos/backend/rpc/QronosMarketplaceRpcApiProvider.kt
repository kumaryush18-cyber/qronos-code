@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.rpc.QronosMarketplaceRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class QronosMarketplaceRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<QronosMarketplaceRpcApi>()) {
            QronosMarketplaceRpcApiImpl()
        }
    }
}
