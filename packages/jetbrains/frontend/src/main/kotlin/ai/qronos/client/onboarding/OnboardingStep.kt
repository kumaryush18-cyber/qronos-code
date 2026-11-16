package ai.qronos.client.onboarding

/** A currently-detected onboarding need, as published by [ai.qronos.client.onboarding.QronosOnboardingService]. */
data class OnboardingStep(
    val id: String,
    val need: OnboardingNeed,
    val blocking: Boolean,
)
