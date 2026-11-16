package ai.qronos.backend.cli

import java.util.Properties

object QronosProps {
    private val props by lazy {
        val stream = QronosProps::class.java.classLoader.getResourceAsStream("qronos.properties")
            ?: throw IllegalStateException("qronos.properties resource not found")
        stream.use {
            Properties().apply { load(it) }
        }
    }

    fun cliVersion(): String = props.getProperty("cli.version")
        ?: throw IllegalStateException("cli.version missing from qronos.properties")

    fun pinned(): Boolean = pinned(props)

    internal fun pinned(props: Properties): Boolean = props.getProperty("cli.pinned")?.toBoolean() ?: true
}
