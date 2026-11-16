#!/usr/bin/env bun

import { Script } from "@qronos-ai/script"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const generated = await import("./generate.ts")

await Bun.build({
  target: "node",
  // qronos_change start
  entrypoints: [
    "./src/node.ts",
    "../qronos-sandbox/src/qronos-sandbox-mutation-worker.ts",
    "../qronos-sandbox/src/qronos-sandbox-network-relay.ts",
  ],
  // qronos_change end
  outdir: "./dist/node",
  format: "esm",
  sourcemap: "linked",
  external: ["jsonc-parser", "@lydell/node-pty"],
  define: {
    QRONOS_MODELS_DEV: generated.modelsData,
    QRONOS_VERSION: `'${Script.version}'`, // qronos_change
    QRONOS_SANDBOX_MUTATION_WORKER_PATH: `'./qronos-sandbox-mutation-worker.js'`, // qronos_change
    QRONOS_SANDBOX_NETWORK_RELAY_PATH: `'./qronos-sandbox-network-relay.js'`, // qronos_change
    QRONOS_SANDBOX_SECCOMP_PATH: "undefined", // qronos_change
    QRONOS_CHANNEL: `'${Script.channel}'`,
  },
  files: {
    "opencode-web-ui.gen.ts": "",
  },
})

console.log("Build complete")
