@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.rpc.QronosMigrationRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class QronosMigrationRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<QronosMigrationRpcApi>()) {
            QronosMigrationRpcApiImpl()
        }
    }
}
