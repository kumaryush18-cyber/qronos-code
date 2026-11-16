{
  lib,
  stdenv,
  fetchurl,
  autoPatchelfHook,
}:
let
  # qronos_change start - use the checksum-pinned npm runtime artifacts
  pin = lib.pipe ../script/qronos/bun.json [
    builtins.readFile
    builtins.fromJSON
  ];
  version = pin.version;
  sources = {
    "aarch64-linux" = pin.artifacts.linux-arm64;
    "x86_64-linux" = pin.artifacts.linux-x64;
    "aarch64-darwin" = pin.artifacts.darwin-arm64;
    "x86_64-darwin" = pin.artifacts.darwin-x64;
  };
  # qronos_change end
  source =
    sources.${stdenv.hostPlatform.system}
      or (throw "Unsupported system for bun: ${stdenv.hostPlatform.system}");
in
stdenv.mkDerivation {
  pname = "bun";
  inherit version;
  src = fetchurl {
    # qronos_change start
    url = "https://registry.npmjs.org/@oven/${source.name}/-/${source.name}-${version}.tgz";
    hash = source.integrity;
    # qronos_change end
  };
  sourceRoot = "package"; # qronos_change
  nativeBuildInputs = lib.optional stdenv.isLinux autoPatchelfHook; # qronos_change
  buildInputs = lib.optionals stdenv.isLinux [ stdenv.cc.cc.lib ];
  dontConfigure = true;
  dontBuild = true;
  installPhase = ''
    runHook preInstall
    install -Dm755 bin/bun $out/bin/bun # qronos_change
    ln -s $out/bin/bun $out/bin/bunx
    runHook postInstall
  '';
  meta = {
    description = "Fast all-in-one JavaScript runtime";
    homepage = "https://bun.sh";
    license = lib.licenses.mit;
    mainProgram = "bun";
    platforms = builtins.attrNames sources;
  };
}
