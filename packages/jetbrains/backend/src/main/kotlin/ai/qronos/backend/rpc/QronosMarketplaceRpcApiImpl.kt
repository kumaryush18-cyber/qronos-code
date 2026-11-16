@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.backend.marketplace.QronosBackendMarketplaceManager
import ai.qronos.rpc.QronosMarketplaceRpcApi
import ai.qronos.rpc.dto.MarketplaceBundleDto
import ai.qronos.rpc.dto.MarketplaceItemDto
import ai.qronos.rpc.dto.MarketplaceListDto
import ai.qronos.rpc.dto.MarketplaceResultDto

class QronosMarketplaceRpcApiImpl(
    backend: QronosBackendAppService? = null,
    private val manager: QronosBackendMarketplaceManager = QronosBackendMarketplaceManager(backend),
) : QronosMarketplaceRpcApi {
    override suspend fun list(directory: String): MarketplaceListDto = manager.list(directory)

    override suspend fun bundles(directory: String): List<MarketplaceBundleDto> = manager.bundles(directory)

    override suspend fun install(
        directory: String,
        item: MarketplaceItemDto,
        target: String,
        parameters: Map<String, String>,
    ): MarketplaceResultDto = manager.install(directory, item, target, parameters)

    override suspend fun remove(directory: String, id: String, type: String, scope: String): MarketplaceResultDto =
        manager.remove(directory, id, type, scope)
}
