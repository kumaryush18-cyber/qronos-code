package ai.qronos.client.agentManager.hosted

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class HostedRepositoryTest {
    @Test
    fun `github https and ssh remotes keep only owner and repository`() {
        assertEquals("Qronos-Org/qronos", hostedRepository("https://github.com/Qronos-Org/qronos.git", null).repo)
        assertEquals("Qronos-Org/qronos", hostedRepository("git@github.com:Qronos-Org/qronos.git", null).repo)
        assertEquals("Qronos-Org/qronos", hostedRepository("ssh://git@github.com/Qronos-Org/qronos.git", null).repo)
        assertEquals("github", hostedRepository("git@github.com:Qronos-Org/qronos.git", "main").type)
        assertEquals("main", hostedRepository("git@github.com:Qronos-Org/qronos.git", "main").branch)
    }

    @Test
    fun `non github remotes keep a clone url`() {
        val gitlab = hostedRepository("git@gitlab.com:Qronos-Org/example.git", null)
        assertEquals("gitlab", gitlab.type)
        assertEquals("ssh://git@gitlab.com/Qronos-Org/example", gitlab.url)
        assertNull(gitlab.repo)

        val git = hostedRepository("https://example.com/Qronos-Org/example.git", null)
        assertEquals("git", git.type)
        assertEquals("https://example.com/Qronos-Org/example", git.url)
    }

    @Test
    fun `repository name drops credentials host and git suffix`() {
        assertEquals("qronos", hostedRepositoryName("git@github.com:Qronos-Org/qronos.git"))
        assertEquals("qronos", hostedRepositoryName("https://github.com/Qronos-Org/qronos.git"))
        assertEquals("qronos", hostedRepositoryName("Qronos-Org/qronos"))
    }

    @Test
    fun `short github values keep the repository path`() {
        val repo = hostedRepository("Qronos-Org/qronos", null)

        assertEquals("github", repo.type)
        assertEquals("Qronos-Org/qronos", repo.repo)
    }

    @Test
    fun `github remotes share a credential-free persistent key`() {
        val key = hostedRepositoryKey("https://github.com/Qronos-Org/qronos.git")

        assertEquals("github:qronos-org/qronos", key)
        assertEquals(key, hostedRepositoryKey("git@github.com:qronos-org/QRONOS.git"))
        assertEquals(key, hostedRepositoryKey("ssh://git@github.com/Qronos-Org/qronos.git/"))
        assertEquals(key, hostedRepositoryKey("https://user:secret@github.com/Qronos-Org/qronos.git?token=hidden"))
        assertFalse(key.contains("secret"))
        assertFalse(key.contains("token"))
    }

    @Test
    fun `non github persistent keys ignore transport but preserve host path case and port`() {
        val key = hostedRepositoryKey("git@gitlab.com:Qronos-Org/example.git")

        assertEquals("gitlab.com/Qronos-Org/example", key)
        assertEquals(key, hostedRepositoryKey("https://gitlab.com/Qronos-Org/example.git"))
        assertNotEquals(key, hostedRepositoryKey("https://gitlab.com/qronos-org/example.git"))
        assertNotEquals(key, hostedRepositoryKey("https://gitlab.com:8443/Qronos-Org/example.git"))
        assertNotEquals(key, hostedRepositoryKey("https://example.com/Qronos-Org/example.git"))
        assertEquals(key, hostedRepositoryKey("git@gitlab.com:Qronos-Org/example.git?token=hidden"))
    }

    @Test
    fun `persistent keys normalize standard ports and retain nonstandard ports`() {
        val github = hostedRepositoryKey("https://github.com/Qronos-Org/qronos.git")
        val gitlab = hostedRepositoryKey("https://gitlab.com/Qronos-Org/example.git")

        assertEquals(github, hostedRepositoryKey("https://github.com:443/Qronos-Org/qronos.git"))
        assertEquals(github, hostedRepositoryKey("ssh://git@github.com:22/Qronos-Org/qronos.git"))
        assertNotEquals(github, hostedRepositoryKey("https://github.com:8443/Qronos-Org/qronos.git"))
        assertEquals(gitlab, hostedRepositoryKey("https://gitlab.com:443/Qronos-Org/example.git"))
        assertEquals(gitlab, hostedRepositoryKey("ssh://git@gitlab.com:22/Qronos-Org/example.git"))
    }

    @Test
    fun `unparseable persistent keys do not retain raw repository values`() {
        val key = hostedRepositoryKey("local path with credentials secret")

        assertEquals("unknown:", key.substringBefore(':') + ":")
        assertFalse(key.contains("secret"))
    }
}
