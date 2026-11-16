package ai.qronos.backend.cli

import java.util.Properties

object QronosCliChecksums {
    private const val RESOURCE = "qronos-cli-checksums.properties"

    private val values by lazy {
        val stream = QronosCliChecksums::class.java.classLoader.getResourceAsStream(RESOURCE)
            ?: return@lazy emptyMap()
        stream.use {
            Properties().apply { load(it) }
                .entries
                .associate { item -> item.key.toString() to item.value.toString() }
        }
    }

    fun load(): Map<String, String> = values
}
