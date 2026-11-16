@file:Suppress("UnstableApiUsage")

package ai.qronos.rpc

import ai.qronos.rpc.dto.CustomModelFetchDto
import ai.qronos.rpc.dto.CustomModelFetchResultDto
import ai.qronos.rpc.dto.CustomProviderSaveDto
import ai.qronos.rpc.dto.ProviderActionResultDto
import ai.qronos.rpc.dto.ProviderConnectDto
import ai.qronos.rpc.dto.ProviderDisconnectDto
import ai.qronos.rpc.dto.ProviderEnableDto
import ai.qronos.rpc.dto.ProviderOAuthAuthorizeDto
import ai.qronos.rpc.dto.ProviderOAuthCallbackDto
import ai.qronos.rpc.dto.ProviderOAuthReadyDto
import ai.qronos.rpc.dto.ProviderSettingsDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor

@Rpc
interface QronosProviderRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): QronosProviderRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<QronosProviderRpcApi>())
        }
    }

    suspend fun state(directory: String): ProviderSettingsDto
    suspend fun connect(input: ProviderConnectDto): ProviderActionResultDto
    suspend fun authorize(input: ProviderOAuthAuthorizeDto): ProviderOAuthReadyDto
    suspend fun callback(input: ProviderOAuthCallbackDto): ProviderActionResultDto
    suspend fun disconnect(input: ProviderDisconnectDto): ProviderActionResultDto
    suspend fun enable(input: ProviderEnableDto): ProviderActionResultDto
    suspend fun saveCustom(input: CustomProviderSaveDto): ProviderActionResultDto
    suspend fun fetchCustomModels(input: CustomModelFetchDto): CustomModelFetchResultDto
}
