# Builds the WebAssembly engine for ShogiHome in the Emscripten Docker image
# (Docker Desktop). See wasm_build.sh.
#
#   .\script\wasm_build.ps1            # incremental build
#   .\script\wasm_build.ps1 -Rebuild   # rebuild every object
param(
    [switch]$Rebuild,
    [string]$EmsdkImage = "emscripten/emsdk:6.0.6"
)
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$buildArgs = @()
if ($Rebuild) { $buildArgs += "rebuild" }

docker run --rm -v "${repoRoot}:/src" -w /src $EmsdkImage bash script/wasm_build_in_docker.sh @buildArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
