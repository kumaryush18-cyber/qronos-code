package ai.qronos.backend.app

import ai.qronos.backend.migration.LegacyMigrationDetection
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PreservesMigrationTest {

    private val migrating = QronosAppState.MigrationRequired(detection())

    @Test
    fun `reconnect churn is ignored while the migration wizard is up`() {
        assertTrue(preservesMigration(migrating, ConnectionState.Connecting))
        assertTrue(preservesMigration(migrating, ConnectionState.Connected(1234, "pw")))
        assertTrue(preservesMigration(migrating, ConnectionState.Error("boom")))
    }

    @Test
    fun `disconnect and download still apply while migrating`() {
        assertFalse(preservesMigration(migrating, ConnectionState.Disconnected))
        assertFalse(preservesMigration(migrating, ConnectionState.Downloading(10, "1.2.3", "darwin-arm64")))
    }

    @Test
    fun `connection transitions apply normally when not migrating`() {
        assertFalse(preservesMigration(QronosAppState.Connecting, ConnectionState.Connected(1234, "pw")))
        assertFalse(preservesMigration(QronosAppState.Connecting, ConnectionState.Connecting))
        assertFalse(preservesMigration(QronosAppState.Disconnected, ConnectionState.Error("boom")))
    }

    private fun detection() = LegacyMigrationDetection(
        providers = emptyList(),
        mcpServers = emptyList(),
        customModes = emptyList(),
        sessions = emptyList(),
        defaultModel = null,
        settings = null,
        hasData = true,
    )
}
