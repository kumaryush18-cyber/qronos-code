package ai.qronos.client.vfs

import kotlinx.serialization.Serializable

@Serializable
data class QronosPath(
    val kind: String,
    val params: Map<String, String> = emptyMap(),
) {
    fun canonical(): QronosPath = copy(params = canonicalParams(params))
}

internal fun canonicalParams(params: Map<String, String>): Map<String, String> {
    if (params.size < 2) return params
    return params.toSortedMap()
}
