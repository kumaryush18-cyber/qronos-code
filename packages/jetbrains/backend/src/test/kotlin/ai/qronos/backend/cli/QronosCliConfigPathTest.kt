package ai.qronos.backend.cli

import kotlin.test.Test
import kotlin.test.assertEquals
import java.io.File
import java.nio.file.Files

class QronosCliConfigPathTest {

    @Test
    fun `qronos config dir overrides XDG config home`() {
        val dir = Files.createTempDirectory("qronos-config-dir").toFile()
        val xdg = Files.createTempDirectory("qronos-xdg-config").toFile()

        val path = QronosCliConfigPath.resolve(
            mapOf(
                "QRONOS_CONFIG_DIR" to dir.absolutePath,
                "XDG_CONFIG_HOME" to xdg.absolutePath,
            ),
        )

        assertEquals(dir.absoluteFile, path.absoluteFile)
    }

    @Test
    fun `XDG config home resolves to qronos subdirectory`() {
        val xdg = Files.createTempDirectory("qronos-xdg-config").toFile()

        val path = QronosCliConfigPath.resolve(mapOf("XDG_CONFIG_HOME" to xdg.absolutePath))

        assertEquals(File(xdg, "qronos").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `default config home matches CLI xdg fallback`() {
        val home = Files.createTempDirectory("qronos-home").toFile()

        val path = QronosCliConfigPath.resolve(mapOf("HOME" to home.absolutePath))

        assertEquals(File(File(home, ".config"), "qronos").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `USERPROFILE backs up HOME for default config home`() {
        val home = Files.createTempDirectory("qronos-userprofile").toFile()

        val path = QronosCliConfigPath.resolve(
            mapOf(
                "HOME" to "",
                "USERPROFILE" to home.absolutePath,
            ),
        )

        assertEquals(File(File(home, ".config"), "qronos").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `blank config env values are ignored`() {
        val home = Files.createTempDirectory("qronos-home").toFile()

        val path = QronosCliConfigPath.resolve(
            mapOf(
                "QRONOS_CONFIG_DIR" to " ",
                "XDG_CONFIG_HOME" to "",
                "HOME" to home.absolutePath,
            ),
        )

        assertEquals(File(File(home, ".config"), "qronos").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `legacy settings file resolves under global config dir`() {
        val home = Files.createTempDirectory("qronos-home").toFile()

        val path = QronosCliConfigPath.legacySettingsFile(mapOf("HOME" to home.absolutePath))

        assertEquals(File(File(File(home, ".config"), "qronos"), "legacy-settings.json").absoluteFile, path.absoluteFile)
    }
}
