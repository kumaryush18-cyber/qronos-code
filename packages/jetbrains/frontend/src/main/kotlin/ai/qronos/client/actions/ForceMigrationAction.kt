package ai.qronos.client.actions

import ai.qronos.client.QronosNotifications
import ai.qronos.client.onboarding.QronosOnboardingService
import ai.qronos.client.onboarding.providers.v5migration.QronosMigrationService
import ai.qronos.client.onboarding.providers.v5migration.MigrationOnboardingProvider
import ai.qronos.client.plugin.QronosBundle
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages

class ForceMigrationAction : AnAction(
    QronosBundle.message("action.Qronos.ForceMigration.text"),
    QronosBundle.message("action.Qronos.ForceMigration.description"),
    null,
), DumbAware {
    internal var confirm: (Project?) -> Boolean = { project ->
        Messages.showYesNoDialog(
            project,
            QronosBundle.message("action.Qronos.ForceMigration.confirm.message"),
            QronosBundle.message("action.Qronos.ForceMigration.confirm.title"),
            Messages.getWarningIcon(),
        ) == Messages.YES
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    override fun actionPerformed(e: AnActionEvent) {
        if (!confirm(e.project)) return
        // A previous `Later` defers the step for the rest of the IDE run, which would leave the app
        // stuck in MIGRATION_REQUIRED with no wizard after the restart below.
        service<QronosOnboardingService>().reoffer(MigrationOnboardingProvider.ID)
        service<QronosMigrationService>().resetStatusAndRestart { ok ->
            if (ok) return@resetStatusAndRestart
            QronosNotifications.error(QronosBundle.message("action.Qronos.ForceMigration.failed"))
        }
    }
}
