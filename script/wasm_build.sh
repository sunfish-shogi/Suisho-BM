#!/usr/bin/env bash
# Builds the WebAssembly engine for ShogiHome (wasm engine ABI: shogihome-wasm-engine/1)
# in the Emscripten Docker image, as YaneuraOu does.
#
#   script/wasm_build.sh            # incremental build
#   script/wasm_build.sh rebuild    # rebuild every object
#
# The package (engine.json, suisho-bm.js, suisho-bm.wasm, LICENSE.txt) is written to
# build/wasm/suisho-bm/. Copy that directory to ShogiHome's public/engines/.
set -euo pipefail

EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:6.0.6}"
repo_root=$(cd "$(dirname "$0")/.." && pwd)

docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$repo_root:/src" \
  -w /src \
  "$EMSDK_IMAGE" \
  bash script/wasm_build_in_docker.sh "$@"
