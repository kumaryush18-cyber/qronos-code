package ai.qronos.client.agentManager.worktree

import ai.qronos.rpc.dto.SetupScriptKind
import ai.qronos.rpc.dto.SetupScriptTargetDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class WorktreeSetupScriptTest : BasePlatformTestCase() {
    fun `test posix command invokes sh with a quoted path`() {
        val script = SetupScriptTargetDto("/repo/.qronos/setup-script", "/repo/.qronos/setup-script", true, SetupScriptKind.POSIX)

        assertEquals("sh '/repo/.qronos/setup-script'", setupScriptCommand(script))
    }

    fun `test powershell command uses NoProfile and Bypass with a quoted path`() {
        val script = SetupScriptTargetDto("C:\\repo\\.qronos\\setup-script.ps1", "C:\\repo\\.qronos\\setup-script.ps1", true, SetupScriptKind.POWERSHELL)

        assertEquals(
            "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File \"C:\\repo\\.qronos\\setup-script.ps1\"",
            setupScriptCommand(script),
        )
    }

    fun `test cmd command uses d s c with a quoted path`() {
        val script = SetupScriptTargetDto("C:\\repo\\.qronos\\setup-script.cmd", "C:\\repo\\.qronos\\setup-script.cmd", true, SetupScriptKind.CMD)

        assertEquals("cmd.exe /d /s /c \"C:\\repo\\.qronos\\setup-script.cmd\"", setupScriptCommand(script))
    }

    fun `test posix quoting escapes an embedded single quote`() {
        val script = SetupScriptTargetDto("/repo/it's/.qronos/setup-script", "/repo/it's/.qronos/setup-script", true, SetupScriptKind.POSIX)

        assertEquals("sh '/repo/it'\\''s/.qronos/setup-script'", setupScriptCommand(script))
    }

    fun `test windows quoting doubles an embedded double quote`() {
        val script = SetupScriptTargetDto("C:\\repo \"copy\"\\.qronos\\setup-script.ps1", "", true, SetupScriptKind.POWERSHELL)

        assertEquals(
            "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File \"C:\\repo \"\"copy\"\"\\.qronos\\setup-script.ps1\"",
            setupScriptCommand(script),
        )
    }

    fun `test posix quoting handles a path containing spaces`() {
        val script = SetupScriptTargetDto("/repo/my worktree/.qronos/setup-script", "", true, SetupScriptKind.POSIX)

        assertEquals("sh '/repo/my worktree/.qronos/setup-script'", setupScriptCommand(script))
    }
}
