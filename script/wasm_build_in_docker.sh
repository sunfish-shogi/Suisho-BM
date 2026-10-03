#!/usr/bin/env bash
# Runs inside the Emscripten Docker image (see wasm_build.sh / wasm_build.ps1).
set -euo pipefail

build_dir=build/wasm
package_dir=$build_dir/suisho-bm

if [ "${1:-}" = "rebuild" ]; then
  make -C source TARGET_CPU=WASM clean
fi
make -C source -j"$(nproc)" TARGET_CPU=WASM

rm -rf "$package_dir"
mkdir -p "$package_dir"
cp "$build_dir/suisho-bm.js" "$build_dir/suisho-bm.wasm" "$package_dir/"
chmod a-x "$package_dir/suisho-bm.wasm"
cp LICENSE "$package_dir/LICENSE.txt"

# engine.json: name, author and options are read from the built engine itself.
node script/wasm_manifest.mjs "$package_dir"

echo "Wasm engine package: $package_dir"
