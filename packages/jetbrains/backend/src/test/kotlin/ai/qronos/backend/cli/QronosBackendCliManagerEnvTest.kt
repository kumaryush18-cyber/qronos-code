package ai.qronos.backend.cli

import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import java.io.File
import java.nio.file.Files

class QronosBackendCliManagerEnvTest {

    private lateinit var tmp: File
    private val manager = QronosBackendCliManager()

    @BeforeTest
    fun setUp() {
        tmp = Files.createTempDirectory("qronos-cli-env-test").toFile()
        System.clearProperty("qronos.dev.storage.isolated")
        System.clearProperty("qronos.dev.worktree.root")
        System.clearProperty("idea.plugin.in.sandbox.mode")
    }

    @AfterTest
    fun tearDown() {
        QronosClaudeCompatSettings.set(false)
        System.clearProperty("qronos.dev.storage.isolated")
        System.clearProperty("qronos.dev.worktree.root")
        System.clearProperty("idea.plugin.in.sandbox.mode")
        tmp.deleteRecursively()
    }

    @Test
    fun `isolation disabled - required JetBrains env vars are present`() {
        val env = manager.buildEnv("pwd123", emptyMap())

        assertEquals("jetbrains", env["QRONOS_CLIENT"])
        assertEquals("true", env["QRONOS_ENABLE_QUESTION_TOOL"])
        assertEquals("jetbrains", env["QRONOS_PLATFORM"])
        assertEquals("qronos-code", env["QRONOS_APP_NAME"])
        assertEquals("all", env["QRONOS_TELEMETRY_LEVEL"])
        assertEquals("true", env["QRONOS_DISABLE_CLAUDE_CODE"])
        assertEquals("jetbrains-plugin", env["QRONOS_FEATURE"])
        assertEquals("pwd123", env["QRONOS_SERVER_PASSWORD"])
    }

    @Test
    fun `pinned CLI - rc channel is forced onto the production database`() {
        val env = manager.buildEnv("pwd123", emptyMap(), pinned = true)

        assertEquals("true", env["QRONOS_DISABLE_CHANNEL_DB"])
    }

    @Test
    fun `pinned CLI - inherited env cannot re-enable the channel database`() {
        val env = manager.buildEnv("pwd123", mapOf("QRONOS_DISABLE_CHANNEL_DB" to "false"), pinned = true)

        assertEquals("true", env["QRONOS_DISABLE_CHANNEL_DB"])
    }

    @Test
    fun `local repo CLI - per-branch dev database is kept`() {
        val env = manager.buildEnv("pwd123", emptyMap(), pinned = false)

        assertFalse(env.containsKey("QRONOS_DISABLE_CHANNEL_DB"))
    }

    @Test
    fun `local repo CLI - developer override is preserved`() {
        val env = manager.buildEnv("pwd123", mapOf("QRONOS_DISABLE_CHANNEL_DB" to "true"), pinned = false)

        assertEquals("true", env["QRONOS_DISABLE_CHANNEL_DB"])
    }

    @Test
    fun `pinned CLI with isolation - production database name resolves under isolated data home`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        System.setProperty("qronos.dev.worktree.root", tmp.absolutePath)

        val env = manager.buildEnv("pwd123", emptyMap(), pinned = true)

        assertEquals("true", env["QRONOS_DISABLE_CHANNEL_DB"])
        assertEquals(File(File(tmp, ".qronos-dev"), "data").absolutePath, env["XDG_DATA_HOME"])
    }

    @Test
    fun `dev mode disables CLI telemetry`() {
        System.setProperty("idea.plugin.in.sandbox.mode", "true")

        val env = manager.buildEnv("pwd123", emptyMap())

        assertEquals("off", env["QRONOS_TELEMETRY_LEVEL"])
    }

    @Test
    fun `claude compatibility omits disable env var`() {
        QronosClaudeCompatSettings.set(true)

        val env = manager.buildEnv("pwd123", emptyMap())

        assertFalse(env.containsKey("QRONOS_DISABLE_CLAUDE_CODE"))
    }

    @Test
    fun `isolation disabled - no permission config is injected over user config`() {
        // The plugin must not outrank the user's global/project qronos.json permission settings.
        // The JetBrains edit-ask default now lives in the CLI's client-keyed defaults layer.
        val env = manager.buildEnv("pwd123", emptyMap())

        assertFalse(env.containsKey("QRONOS_CONFIG_CONTENT"))
    }

    @Test
    fun `isolation disabled - base CLI config is preserved`() {
        val cfg = """{"permission":{"edit":"allow"}}"""

        val env = manager.buildEnv("pwd123", mapOf("QRONOS_CONFIG_CONTENT" to cfg))

        assertEquals(cfg, env["QRONOS_CONFIG_CONTENT"])
    }

    @Test
    fun `isolation disabled - base PATH is preserved`() {
        val path = "/opt/homebrew/bin:/usr/bin"

        val env = manager.buildEnv("pwd123", mapOf("PATH" to path))

        assertEquals(path, env["PATH"])
    }

    @Test
    fun `isolation disabled - no XDG storage overrides are injected`() {
        val env = manager.buildEnv("pwd123", emptyMap())

        assertFalse(env.containsKey("XDG_DATA_HOME"), "XDG_DATA_HOME should not be set when isolation is off")
        assertFalse(env.containsKey("XDG_CONFIG_HOME"), "XDG_CONFIG_HOME should not be set when isolation is off")
        assertFalse(env.containsKey("XDG_STATE_HOME"), "XDG_STATE_HOME should not be set when isolation is off")
        assertFalse(env.containsKey("XDG_CACHE_HOME"), "XDG_CACHE_HOME should not be set when isolation is off")
    }

    @Test
    fun `isolation enabled - XDG vars point under qronos-dev in worktree root`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        System.setProperty("qronos.dev.worktree.root", tmp.absolutePath)

        val env = manager.buildEnv("pwd123", emptyMap())

        val dev = File(tmp, ".qronos-dev")
        assertEquals(File(dev, "data").absolutePath, env["XDG_DATA_HOME"])
        assertEquals(File(dev, "config").absolutePath, env["XDG_CONFIG_HOME"])
        assertEquals(File(dev, "state").absolutePath, env["XDG_STATE_HOME"])
        assertEquals(File(dev, "cache").absolutePath, env["XDG_CACHE_HOME"])
    }

    @Test
    fun `isolation enabled - qronos-dev subdirectories are created`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        System.setProperty("qronos.dev.worktree.root", tmp.absolutePath)

        manager.buildEnv("pwd123", emptyMap())

        val dev = File(tmp, ".qronos-dev")
        assertTrue(File(dev, "data").isDirectory, "data dir should be created")
        assertTrue(File(dev, "config").isDirectory, "config dir should be created")
        assertTrue(File(dev, "state").isDirectory, "state dir should be created")
        assertTrue(File(dev, "cache").isDirectory, "cache dir should be created")
    }

    @Test
    fun `isolation enabled - required JetBrains env vars are still present`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        System.setProperty("qronos.dev.worktree.root", tmp.absolutePath)

        val env = manager.buildEnv("pwd123", emptyMap())

        assertEquals("jetbrains", env["QRONOS_CLIENT"])
        assertEquals("pwd123", env["QRONOS_SERVER_PASSWORD"])
        assertEquals("jetbrains-plugin", env["QRONOS_FEATURE"])
    }

    @Test
    fun `isolation enabled - base env vars are preserved`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        System.setProperty("qronos.dev.worktree.root", tmp.absolutePath)

        val env = manager.buildEnv("pwd123", mapOf("MY_CUSTOM_VAR" to "hello"))

        assertEquals("hello", env["MY_CUSTOM_VAR"])
    }

    @Test
    fun `isolation enabled without worktree root - no XDG vars are injected`() {
        System.setProperty("qronos.dev.storage.isolated", "true")
        // qronos.dev.worktree.root is intentionally not set

        val env = manager.buildEnv("pwd123", emptyMap())

        assertFalse(env.containsKey("XDG_DATA_HOME"), "XDG_DATA_HOME should not be set when root is missing")
        assertFalse(env.containsKey("XDG_CONFIG_HOME"), "XDG_CONFIG_HOME should not be set when root is missing")
        assertFalse(env.containsKey("XDG_STATE_HOME"), "XDG_STATE_HOME should not be set when root is missing")
        assertFalse(env.containsKey("XDG_CACHE_HOME"), "XDG_CACHE_HOME should not be set when root is missing")
    }

    @Test
    fun `work dir is created under the provided root`() {
        val dir = workDir(tmp)

        assertEquals(File(tmp, "cwd"), dir)
        assertTrue(dir!!.isDirectory, "work dir should be created")
    }

    @Test
    fun `work dir is reused when it already exists`() {
        val first = workDir(tmp)
        val second = workDir(tmp)

        assertEquals(first, second)
        assertTrue(second!!.isDirectory, "work dir should still exist on reuse")
    }

    @Test
    fun `work dir is returned when the directory was created concurrently`() {
        // mkdirs() returns false for an already-existing directory; that must not fall back to
        // the inherited IDE cwd, which is the $HOME resolution this helper exists to prevent.
        File(tmp, "cwd").mkdirs()

        val dir = workDir(tmp)

        assertEquals(File(tmp, "cwd"), dir)
    }

    @Test
    fun `work dir is never home or a filesystem root`() {
        val dir = workDir(tmp)

        assertTrue(dir != null)
        assertFalse(dir!!.absolutePath == System.getProperty("user.home"), "work dir must not be the home directory")
        assertFalse(dir.absolutePath == dir.toPath().root?.toString(), "work dir must not be a filesystem root")
    }

    @Test
    fun `work dir returns null when the root cannot be created`() {
        val blocker = File(tmp, "blocker")
        blocker.writeText("not a directory")

        val dir = workDir(blocker)

        assertEquals(null, dir)
    }
}
