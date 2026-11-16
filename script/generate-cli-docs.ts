#!/usr/bin/env bun

import { $ } from "bun"

await $`bun run --conditions=browser ./src/qronos/generate-cli-docs.ts`.cwd("packages/cli")
