import normalization.NormalizeOpenApiSpecTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Exec
import org.gradle.api.tasks.WriteProperties
import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    alias(libs.plugins.rpc)
    alias(libs.plugins.kotlin)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.openapi.generator)
    id("build-tasks")
}

kotlin {
    jvmToolchain(21)
}

val generatedApi = layout.buildDirectory.dir("generated/openapi/src/main/kotlin")
val rawSpec = layout.buildDirectory.file("generated/openapi-spec/openapi.raw.json")
val generatedSpec = layout.buildDirectory.file("generated/openapi-spec/openapi.json")
val generatedProps = layout.buildDirectory.dir("generated/qronos-props")
val generatedCli = layout.buildDirectory.dir("generated/qronos-cli-res")
val generatedChecksums = layout.buildDirectory.dir("generated/qronos-cli-checksums")
val pinned = providers.gradleProperty("qronos.cli.pinned").map { it.trim().toBoolean() }.orElse(true)
val repoCli = pinned.map { !it }
val bundled = providers.gradleProperty("qronos.cli.bundled").map { it.trim().toBoolean() }.orElse(false)
val downloadsCli = repoCli.zip(bundled) { repo, bundle -> !repo && !bundle }
val repoRootDir = rootProject.layout.projectDirectory.dir("../cli")
val local = rootProject.layout.projectDirectory.file(".gradle/qronos-cli-pin.properties")
val bunPathProvider = providers.fileContents(local).asText.map { text ->
    text.lineSequence().firstNotNullOfOrNull { line ->
        val pair = line.split("=", limit = 2)
        if (pair.getOrNull(0)?.trim() == "bun.path") pair.getOrNull(1)?.trim()?.takeIf { it.isNotEmpty() } else null
    } ?: "bun"
}.orElse("bun")

val pinnedCliVersion = providers.fileContents(rootProject.layout.projectDirectory.file("package.json")).asText.map { text ->
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(text)?.groupValues?.get(1)
        ?: error("Could not read version from package.json")
}

sourceSets {
    main {
        resources.srcDir(generatedProps)
        if (downloadsCli.get()) resources.srcDir(generatedChecksums)
        if (repoCli.get() || bundled.get()) resources.srcDir(generatedCli)
        kotlin.srcDir(generatedApi)
    }
}

if (repoCli.get() && bundled.get()) {
    error("qronos.cli.bundled=true requires qronos.cli.pinned=true; do not combine release CLI bundling with local repo CLI mode.")
}

val writeQronosProperties = tasks.register<WriteProperties>("writeQronosProperties") {
    description = "Write pinned Qronos CLI properties"
    val out = generatedProps.map { it.file("qronos.properties") }
    destinationFile.set(out)
    property("cli.version", pinnedCliVersion)
    property("cli.pinned", pinned.map { it.toString() })
}

val generateOpenApiSpec = tasks.register<GenerateOpenApiSpecTask>("generateOpenApiSpec") {
    description = "Generate CLI OpenAPI spec into the build directory"
    cliVersion.set(pinnedCliVersion)
    repo.set(repoCli)
    repoRoot.set(repoRootDir)
    token.set(
        providers.environmentVariable("GH_TOKEN")
            .orElse(providers.environmentVariable("GITHUB_TOKEN"))
    )
    cacheDir.set(layout.buildDirectory.dir("cli-cache"))
    spec.set(rawSpec)
    bunPath.set(bunPathProvider)
}

val buildRepoCli = tasks.register<Exec>("buildRepoCli") {
    description = "Build the local repo CLI for the current platform"
    workingDir = repoRootDir.asFile
    commandLine(bunPathProvider.get(), "run", "script/build.ts", "--single", "--skip-install")
}

fun platform(): String {
    val os = System.getProperty("os.name").lowercase()
    val name = when {
        os.contains("mac") || os.contains("darwin") -> "darwin"
        os.contains("linux") -> "linux"
        os.contains("windows") -> "windows"
        else -> throw GradleException("Unsupported OS: ${System.getProperty("os.name")}")
    }
    val arch = when (System.getProperty("os.arch").lowercase()) {
        "aarch64", "arm64" -> "arm64"
        "x86_64", "amd64" -> "x64"
        else -> throw GradleException("Unsupported architecture: ${System.getProperty("os.arch")}")
    }
    return "$name-$arch"
}

val stageRepoCli = tasks.register<StageRepoCliTask>("stageRepoCli") {
    description = "Stage the local repo CLI into backend resources"
    val bin = repoRootDir.dir("dist/@qronos-ai/cli-${platform()}/bin")
    this.bin.set(bin)
    archive.set(generatedCli.map { it.file("qronos-cli.zip") })
    outputs.upToDateWhen { false }
    mustRunAfter(buildRepoCli)
}

val stageBundledCli = tasks.register<StageBundledCliTask>("stageBundledCli") {
    description = "Stage all pinned Qronos CLI release assets into backend resources"
    cliVersion.set(pinnedCliVersion)
    token.set(
        providers.environmentVariable("GH_TOKEN")
            .orElse(providers.environmentVariable("GITHUB_TOKEN"))
    )
    cacheDir.set(layout.buildDirectory.dir("cli-cache"))
    archive.set(generatedCli.map { it.file("qronos-cli.zip") })
}

val writeCliChecksums = tasks.register<WriteCliChecksumsTask>("writeCliChecksums") {
    description = "Write pinned Qronos CLI checksums"
    cliVersion.set(pinnedCliVersion)
    token.set(
        providers.environmentVariable("GH_TOKEN")
            .orElse(providers.environmentVariable("GITHUB_TOKEN"))
    )
    checksums.set(generatedChecksums.map { it.file("qronos-cli-checksums.properties") })
}

val normalizeOpenApiSpec = tasks.register<NormalizeOpenApiSpecTask>("normalizeOpenApiSpec") {
    description = "Normalize upstream CLI OpenAPI metadata before Kotlin client generation"
    dependsOn(generateOpenApiSpec)
    input.set(rawSpec)
    spec.set(generatedSpec)
}

openApiGenerate {
    generatorName.set("kotlin")
    library.set("jvm-okhttp4")
    inputSpec.set(generatedSpec)
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    packageName.set("ai.qronos.jetbrains.api")
    apiPackage.set("ai.qronos.jetbrains.api.client")
    modelPackage.set("ai.qronos.jetbrains.api.model")
    configOptions.set(mapOf(
        "serializationLibrary" to "kotlinx_serialization",
        "omitGradleWrapper" to "true",
        "omitGradlePluginVersions" to "true",
        "useCoroutines" to "false",
        "sourceFolder" to "src/main/kotlin",
        "enumPropertyNaming" to "UPPERCASE",
    ))
    modelNameMappings.set(mapOf(
        "File" to "DiffFileInfo",
    ))
    typeMappings.set(mapOf(
        "AnyOfLessThanGreaterThan" to "kotlin.Any",
        "anyOf<>" to "kotlin.Any",
        "number" to "kotlin.Double",
        "decimal" to "kotlin.Double",
        "integer" to "kotlin.Long",
    ))
    openapiNormalizer.set(mapOf(
        "SIMPLIFY_ANYOF_STRING_AND_ENUM_STRING" to "true",
        "SIMPLIFY_ONEOF_ANYOF" to "true",
    ))
    generateApiTests.set(false)
    generateModelTests.set(false)
    generateApiDocumentation.set(false)
    generateModelDocumentation.set(false)
}

tasks.named("openApiGenerate") {
    dependsOn(normalizeOpenApiSpec)
}

val fixGeneratedApi = tasks.register<FixGeneratedApiTask>("fixGeneratedApi") {
    dependsOn("openApiGenerate")
    generated.set(generatedApi)
}

tasks.named("compileKotlin") {
    dependsOn(fixGeneratedApi, writeQronosProperties)
    if (downloadsCli.get()) dependsOn(writeCliChecksums)
    if (repoCli.get()) dependsOn(stageRepoCli)
    if (bundled.get()) dependsOn(stageBundledCli)
    inputs.dir(generatedApi)
}

tasks.named("processResources") {
    dependsOn(writeQronosProperties)
    if (downloadsCli.get()) dependsOn(writeCliChecksums)
    if (repoCli.get()) dependsOn(stageRepoCli)
    if (bundled.get()) dependsOn(stageBundledCli)
}

tasks.named("compileTestKotlin") {
    dependsOn(fixGeneratedApi)
    inputs.dir(generatedApi)
}

dependencies {
    intellijPlatform {
        intellijIdea(libs.versions.intellij.platform)
        bundledModule("intellij.platform.kernel.backend")
        bundledModule("intellij.platform.rpc.backend")
        bundledModule("intellij.platform.backend")
        testFramework(TestFrameworkType.Platform)
    }

    implementation(project(":shared"))
    implementation(libs.okhttp)
    implementation(libs.okhttp.sse)
    implementation(libs.commons.compress)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(kotlin("test"))
    testImplementation(libs.junit)
    testRuntimeOnly(libs.junit.vintage.engine)
}

tasks.test {
    // BasePlatformTestCase uses JUnit 3 test naming (test prefix), discovered by the
    // vintage engine via JUnit Platform; plain JUnit 5 tests keep running unchanged.
    useJUnitPlatform()
    jvmArgs("-Didea.force.use.core.classloader=true")
}
