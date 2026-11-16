@file:Suppress("UnstableApiUsage")

package ai.qronos.backend.rpc

import ai.qronos.backend.app.QronosAppState
import ai.qronos.backend.app.QronosBackendAppService
import ai.qronos.rpc.QronosHostedRpcApi
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
import com.intellij.openapi.components.service
import kotlinx.coroutines.flow.Flow

/**
 * Backend implementation of hosted workspace discovery. All calls cross the local CLI's Session
 * Host and its opaque attachment; nothing here talks to a provider directly.
 */
class QronosHostedRpcApiImpl internal constructor(
    private val appOverride: QronosBackendAppService? = null,
) : QronosHostedRpcApi {
    private val app: QronosBackendAppService
        get() = appOverride ?: service()

    override suspend fun providers(): List<HostedProviderDto> {
        app.requireReady()
        return app.hosted.providers()
    }

    override suspend fun workspaces(
        repositoryUrl: String?,
        cursor: String?,
        organizationID: String?,
    ): HostedWorkspaceListDto {
        app.requireReady()
        return app.hosted.workspaces(repositoryUrl, cursor, organizationID ?: organization())
    }

    override suspend fun workspace(
        ref: HostedWorkspaceRefDto,
        sessionCursor: String?,
        organizationID: String?,
    ): HostedWorkspaceDto {
        app.requireReady()
        return app.hosted.workspace(ref, sessionCursor, organizationID ?: organization())
    }

    override suspend fun workspaceStatus(
        ref: HostedWorkspaceRefDto,
        organizationID: String?,
    ): HostedWorkspaceStatusDto {
        app.requireReady()
        return app.hosted.workspaceStatus(ref, organizationID ?: organization())
    }

    override suspend fun workspaceProfiles(organizationID: String?): HostedWorkspaceProfileListDto {
        app.requireReady()
        return app.hosted.workspaceProfiles(organizationID ?: organization())
    }

    override suspend fun setPersonalDefaultProfile(profileID: String): HostedProfileDefaultDto {
        app.requireReady()
        return app.hosted.setPersonalDefaultProfile(profileID, organization())
    }

    override suspend fun createWorkspace(request: HostedCreateWorkspaceDto): HostedMutationResultDto {
        app.requireReady()
        return app.hosted.createWorkspace(request.copy(organizationID = request.organizationID ?: organization()))
    }

    override suspend fun startWorkspaceSession(
        ref: HostedWorkspaceRefDto,
        request: HostedStartSessionDto,
    ): HostedMutationResultDto {
        app.requireReady()
        return app.hosted.startWorkspaceSession(
            ref,
            request.copy(organizationID = request.organizationID ?: organization()),
        )
    }

    override suspend fun deleteWorkspace(
        ref: HostedWorkspaceRefDto,
        organizationID: String?,
    ): HostedDeleteResultDto {
        app.requireReady()
        return app.hosted.deleteWorkspace(ref, organizationID ?: organization())
    }

    override suspend fun systemEvents(
        ref: HostedWorkspaceRefDto,
        sessionID: String,
        organizationID: String?,
    ): Flow<HostedSystemEventDto> {
        app.requireReady()
        return app.hosted.systemEvents(ref, sessionID, organizationID ?: organization())
    }

    private fun organization(): String? =
        (app.appState.value as? QronosAppState.Ready)?.data?.profile?.currentOrgId
}
