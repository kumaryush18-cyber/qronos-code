package ai.qronos.rpc

import ai.qronos.rpc.dto.HostedCreateWorkspaceDto
import ai.qronos.rpc.dto.HostedDeleteResultDto
import ai.qronos.rpc.dto.HostedMutationResultDto
import ai.qronos.rpc.dto.HostedProfileDefaultDto
import ai.qronos.rpc.dto.HostedProviderDto
import ai.qronos.rpc.dto.HostedStartSessionDto
import ai.qronos.rpc.dto.HostedSystemEventDto
import ai.qronos.rpc.dto.HostedWorkspaceDto
import ai.qronos.rpc.dto.HostedWorkspaceListDto
import ai.qronos.rpc.dto.HostedWorkspaceProfileListDto
import ai.qronos.rpc.dto.HostedWorkspaceRefDto
import ai.qronos.rpc.dto.HostedWorkspaceStatusDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor
import kotlinx.coroutines.flow.Flow

/**
 * Provider-neutral hosted Cloud workspace discovery, entirely through the local `qronos serve`
 * Session Host. No provider origin, credential, or Cloud transport is exposed here.
 */
@Rpc
interface QronosHostedRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): QronosHostedRpcApi =
            RemoteApiProviderService.resolve(remoteApiDescriptor<QronosHostedRpcApi>())
    }

    /** Hosted providers and their current availability. Signed out is a state, not an error. */
    suspend fun providers(): List<HostedProviderDto>

    /**
     * Authorized workspaces for [repositoryUrl]. [cursor] pages workspaces; each workspace carries
     * its first page of root sessions and a [HostedWorkspaceDto.sessionCursor] for further pages.
     */
    suspend fun workspaces(repositoryUrl: String?, cursor: String?, organizationID: String?): HostedWorkspaceListDto

    /** One workspace with a page of root sessions. */
    suspend fun workspace(ref: HostedWorkspaceRefDto, sessionCursor: String?, organizationID: String?): HostedWorkspaceDto

    /** Passive compute/billing status. Reads never wake compute. */
    suspend fun workspaceStatus(ref: HostedWorkspaceRefDto, organizationID: String?): HostedWorkspaceStatusDto

    /** Authorized, sanitized profile choices for workspace creation. */
    suspend fun workspaceProfiles(organizationID: String?): HostedWorkspaceProfileListDto

    /** Set the authenticated user's personal default workspace profile. */
    suspend fun setPersonalDefaultProfile(profileID: String): HostedProfileDefaultDto

    /** Create a workspace and its first root session. Retry with the same operation/message IDs. */
    suspend fun createWorkspace(request: HostedCreateWorkspaceDto): HostedMutationResultDto

    /** Add a root session to [ref]. The workspace supplies repository, profile, and compute. */
    suspend fun startWorkspaceSession(
        ref: HostedWorkspaceRefDto,
        request: HostedStartSessionDto,
    ): HostedMutationResultDto

    /** Delete a whole workspace and invalidate only its local attachments. */
    suspend fun deleteWorkspace(ref: HostedWorkspaceRefDto, organizationID: String?): HostedDeleteResultDto

    /**
     * Decoded preparation/cloud/sandbox status for one attached hosted session. [sessionID] is the
     * provider-native session ID, not its composite hosted identity.
     */
    suspend fun systemEvents(ref: HostedWorkspaceRefDto, sessionID: String, organizationID: String?): Flow<HostedSystemEventDto>
}
