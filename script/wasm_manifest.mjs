#!/usr/bin/env node
// Writes engine.json (ShogiHome's wasm engine manifest, shogihome-wasm-engine/1)
// for the wasm package in the given directory.
//
//   node script/wasm_manifest.mjs build/wasm/suisho-bm
//
// "name", "author" and "options" must match what the engine answers to "usi",
// so they are read from the built engine rather than written by hand.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MODULE = "suisho-bm.js";

const packageDir = path.resolve(process.argv[2] || "build/wasm/suisho-bm");
const { default: createEngine } = await import(pathToFileURL(path.join(packageDir, MODULE)).href);

// Sends "usi" and collects the lines up to "usiok".
async function readUsi() {
  const engine = await createEngine({ printErr: (line) => console.error(line) });
  const lines = [];
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no usiok from the engine")), 10000);
      engine.addMessageListener((line) => {
        lines.push(line);
        if (line === "usiok") {
          clearTimeout(timer);
          resolve();
        }
      });
      engine.postMessage("usi");
    });
  } finally {
    engine.terminate();
  }
  return lines;
}

// "option name <name> type <type> default <v> [min <v> max <v>] [var <v>]*"
function parseOption(line) {
  const tokens = line.split(" ").slice(1);
  const option = {};
  const vars = [];
  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];
    if (key === "name") option.name = tokens[++i];
    else if (key === "type") option.type = tokens[++i];
    else if (key === "default") option.default = tokens[++i] ?? "";
    else if (key === "min") option.min = Number(tokens[++i]);
    else if (key === "max") option.max = Number(tokens[++i]);
    else if (key === "var") vars.push(tokens[++i]);
  }
  if (option.type === "spin") option.default = Number(option.default);
  if (option.type === "combo") option.vars = vars;
  if (option.type === "button") delete option.default;
  return option;
}

const lines = await readUsi();
const id = (key) => {
  const line = lines.find((l) => l.startsWith(`id ${key} `));
  if (!line) throw new Error(`no "id ${key}" from the engine`);
  return line.substring(`id ${key} `.length);
};

const manifest = {
  abi: "shogihome-wasm-engine/1",
  module: MODULE,
  moduleFormat: "esm",
  name: id("name"),
  author: id("author"),
  // Built with -pthread: SharedArrayBuffer needs a cross-origin isolated page.
  requiresCrossOriginIsolation: true,
  licenses: [
    {
      spdx: "GPL-3.0-only",
      file: "LICENSE.txt",
      source: "https://github.com/tayayan/Suisho-BM",
    },
  ],
  options: lines.filter((l) => l.startsWith("option ")).map(parseOption),
  // The id becomes es://usi-engine/builtin/<id> and is saved in users' settings:
  // never change it once published (add "-v2" etc. instead).
  presets: [
    {
      id: "suisho-bm-wasm-v1",
      displayName: "Suisho-BM",
      values: {},
      tags: ["mate"],
    },
  ],
};

const file = path.join(packageDir, "engine.json");
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${file}`);
