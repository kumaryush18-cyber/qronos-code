@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.backend.provider.QronosBackendProviderSettingsManager
import ai.qronos.rpc.QronosProviderRpcApi
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
import com.intellij.openapi.components.service
import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.log.QronosLog

internal class QronosProviderRpcApiImpl : QronosProviderRpcApi {
    companion object {
        private val LOG = QronosLog.create(QronosProviderRpcApiImpl::class.java)
    }

    private val manager: QronosBackendProviderSettingsManager
        get() = QronosBackendProviderSettingsManager(service<QronosBackendAppService>())

    override suspend fun state(directory: String): ProviderSettingsDto = logged("state dir=$directory") { manager.state(directory) }
    override suspend fun connect(input: ProviderConnectDto): ProviderActionResultDto = logged("connect provider=${input.providerId}") { manager.connect(input) }
    override suspend fun authorize(input: ProviderOAuthAuthorizeDto): ProviderOAuthReadyDto = logged("authorize provider=${input.providerId}") { manager.authorize(input) }
    override suspend fun callback(input: ProviderOAuthCallbackDto): ProviderActionResultDto = logged("callback provider=${input.providerId}") { manager.callback(input) }
    override suspend fun disconnect(input: ProviderDisconnectDto): ProviderActionResultDto = logged("disconnect provider=${input.providerId}") { manager.disconnect(input) }
    override suspend fun enable(input: ProviderEnableDto): ProviderActionResultDto = logged("enable provider=${input.providerId}") { manager.enable(input) }
    override suspend fun saveCustom(input: CustomProviderSaveDto): ProviderActionResultDto = logged("save custom provider=${input.id}") { manager.saveCustom(input) }
    override suspend fun fetchCustomModels(input: CustomModelFetchDto): CustomModelFetchResultDto = logged("fetch custom models") { manager.fetch(input) }

    private suspend fun <T> logged(name: String, block: suspend () -> T): T {
        val start = System.currentTimeMillis()
        LOG.info("provider rpc $name: start")
        return try {
            val result = block()
            LOG.info("provider rpc $name: completed durationMs=${System.currentTimeMillis() - start}")
            result
        } catch (e: Exception) {
            LOG.warn("provider rpc $name: failed durationMs=${System.currentTimeMillis() - start}", e)
            throw e
        }
    }
}
