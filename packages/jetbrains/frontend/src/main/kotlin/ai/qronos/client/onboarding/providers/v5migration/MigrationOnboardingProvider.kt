package ai.qronos.client.onboarding.providers.v5migration

import ai.qronos.client.onboarding.OnboardingNeed
import ai.qronos.client.onboarding.OnboardingProvider
import ai.qronos.client.onboarding.OnboardingStepView
import ai.qronos.client.onboarding.providers.v5migration.ui.MigrationStepView
import ai.qronos.client.plugin.QronosBundle
import com.intellij.util.concurrency.annotations.RequiresEdt
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/**
 * Ports the v5 legacy-settings migration into the onboarding framework.
 *
 * Wraps [MigrationUiController] (backed by [QronosMigrationService]) unchanged — all RPC, telemetry,
 * and run-state ownership stays there. This provider only translates its state into the generic
 * [OnboardingProvider] contract.
 */
class MigrationOnboardingProvider(private val migration: MigrationUiController) : OnboardingProvider {

    override val id: String = ID

    override val blocking: Boolean = true

    override val invalidate: Flow<Unit> =
        migration.state.map { it is MigrationUiState.Needed }.distinctUntilChanged().map { }

    override suspend fun detect(): OnboardingNeed? {
        migration.state.value as? MigrationUiState.Needed ?: return null
        return OnboardingNeed(
            title = QronosBundle.message("onboarding.migration.title"),
            detail = QronosBundle.message("onboarding.migration.detail"),
        )
    }

    @RequiresEdt
    override fun view(): OnboardingStepView = MigrationStepView(migration)

    override fun skip() {
        migration.skip()
    }

    override suspend fun later(): Boolean = migration.later()

    companion object {
        const val ID = "v5-migration"
    }
}
