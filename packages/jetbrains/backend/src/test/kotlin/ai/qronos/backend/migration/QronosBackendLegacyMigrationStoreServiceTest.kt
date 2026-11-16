package ai.qronos.backend.migration

import ai.qronos.backend.testing.TestLog
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class QronosBackendLegacyMigrationStoreServiceTest {
    @Test
    fun `status marker survives deleted legacy settings file`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = QronosBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.CompletedWithErrors)
        store.cleanup(LegacyCleanupTargets(legacySettingsFile = true))
        QronosBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertFalse(dir.resolve("legacy-settings.json").exists())
        assertEquals(LegacyMigrationStatus.Completed, QronosBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `inline completed status is adopted into durable marker`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = QronosBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Completed)

        // First read adopts the inline status into the durable marker.
        assertEquals(LegacyMigrationStatus.Completed, QronosBackendLegacyMigrationStoreService.status(log, env))
        assertTrue(dir.resolve("legacy-migration-status").isFile)

        // The adopted marker then survives deletion of the legacy settings file.
        store.cleanup(LegacyCleanupTargets(legacySettingsFile = true))
        assertFalse(dir.resolve("legacy-settings.json").exists())
        assertEquals(LegacyMigrationStatus.Completed, QronosBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `inline skipped status is adopted into durable marker`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = QronosBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Skipped)

        assertEquals(LegacyMigrationStatus.Skipped, QronosBackendLegacyMigrationStoreService.status(log, env))
        assertTrue(dir.resolve("legacy-migration-status").isFile)
    }

    @Test
    fun `absent status stays null`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()

        assertNull(QronosBackendLegacyMigrationStoreService.status(log, env))
        assertFalse(dir.resolve("legacy-migration-status").exists())
    }

    @Test
    fun `durable completed status is honored while legacy source payload remains`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = QronosBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Completed)
        dir.resolve("legacy-settings.json").writeText(
            """{"migrationStatus":"Completed","providerProfiles":"{\"currentApiConfigName\":\"p\",\"apiConfigs\":{}}"}"""
        )
        QronosBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertEquals(LegacyMigrationStatus.Completed, QronosBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `reset status deletes durable marker`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        QronosBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertEquals(LegacyMigrationStatus.Completed, QronosBackendLegacyMigrationStoreService.status(log, env))
        assertEquals(true, QronosBackendLegacyMigrationStoreService.resetStatus(log, env))
        assertNull(QronosBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `reset status clears adopted inline status`() {
        val dir = Files.createTempDirectory("qronos-migration-config").toFile()
        val env = mapOf("QRONOS_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = QronosBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Skipped)

        assertEquals(LegacyMigrationStatus.Skipped, QronosBackendLegacyMigrationStoreService.status(log, env))
        assertEquals(true, QronosBackendLegacyMigrationStoreService.resetStatus(log, env))
        assertNull(QronosBackendLegacyMigrationStoreService.status(log, env))
    }
}
