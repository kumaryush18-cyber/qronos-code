package ai.qronos.rpc

import ai.qronos.rpc.dto.MarketplaceItemDto
import ai.qronos.rpc.dto.MarketplaceBundleDto
import ai.qronos.rpc.dto.MarketplaceListDto
import ai.qronos.rpc.dto.MarketplaceResultDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor

@Rpc
interface QronosMarketplaceRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): QronosMarketplaceRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<QronosMarketplaceRpcApi>())
        }
    }

    suspend fun list(directory: String): MarketplaceListDto

    suspend fun bundles(directory: String): List<MarketplaceBundleDto>

    suspend fun install(
        directory: String,
        item: MarketplaceItemDto,
        target: String,
        parameters: Map<String, String>,
    ): MarketplaceResultDto

    suspend fun remove(directory: String, id: String, type: String, scope: String): MarketplaceResultDto
}
