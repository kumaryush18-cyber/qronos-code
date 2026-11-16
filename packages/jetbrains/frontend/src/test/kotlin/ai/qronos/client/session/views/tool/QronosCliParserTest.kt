package ai.qronos.client.session.views.tool

import ai.qronos.cli.QronosCliParser
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class QronosCliParserTest {
    @Test
    fun `tag extracts trimmed tool xml value`() {
        val text = """
            <path>
              /tmp/example.txt
            </path>
            <type>file</type>
        """.trimIndent()

        assertEquals("/tmp/example.txt", QronosCliParser.tag(text, "path"))
        assertEquals("file", QronosCliParser.tag(text, "type"))
    }

    @Test
    fun `tag returns null for blank or missing value`() {
        assertNull(QronosCliParser.tag("<path>   </path>", "path"))
        assertNull(QronosCliParser.tag("<type>file</type>", "path"))
    }
}
