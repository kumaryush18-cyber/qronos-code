{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  bubblewrap,
  nodejs,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node-modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "qronos";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    nodejs # for patchShebangs node_modules
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .
    patchShebangs node_modules
    patchShebangs packages/*/node_modules

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.QRONOS_DISABLE_MODELS_FETCH = true;
  env.QRONOS_SKIP_BUNDLED_BWRAP = "1";
  env.QRONOS_VERSION = finalAttrs.version;
  env.QRONOS_CHANNEL = "local";

  buildPhase = ''
    runHook preBuild

    cd ./packages/cli
    bun --bun ./script/build.ts --single --skip-install
    bun --bun ./script/schema.ts schema.json

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/@qronos-ai/cli-*/bin/qronos $out/bin/qronos
    install -Dm644 schema.json $out/share/qronos/schema.json

    wrapProgram $out/bin/qronos \
      ${lib.optionalString stdenvNoCC.hostPlatform.isLinux "--set QRONOS_BWRAP_PATH ${bubblewrap}/bin/bwrap"} \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if running on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      }

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # trick yargs into also generating zsh completions
    installShellCompletion --cmd qronos \
      --bash <($out/bin/qronos completion) \
      --zsh <(SHELL=/bin/zsh $out/bin/qronos completion)
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [
    "HOME"
    "QRONOS_DISABLE_MODELS_FETCH"
  ];
  versionCheckProgramArg = "--version";

  passthru = {
    jsonschema = "${placeholder "out"}/share/qronos/schema.json";
  };

  meta = {
    description = "AI-powered development tool";
    homepage = "https://qronos.me/";
    license = [ lib.licenses.mit ] ++ lib.optional stdenvNoCC.hostPlatform.isLinux lib.licenses.lgpl2Plus;
    mainProgram = "qronos";
    inherit (node_modules.meta) platforms;
  };
})
