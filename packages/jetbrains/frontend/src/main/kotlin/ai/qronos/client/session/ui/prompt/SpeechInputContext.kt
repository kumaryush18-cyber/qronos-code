package ai.qronos.client.session.ui.prompt

interface SpeechInputContext {
    val isSpeechEnabled: Boolean

    fun toggleSpeech()
}
