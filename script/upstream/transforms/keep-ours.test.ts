import { expect, test } from "bun:test"
import { shouldKeepOurs } from "./keep-ours"

test("keeps files in Kilo-specific directories", () => {
  expect(shouldKeepOurs("packages/extension/.prettierignore", [])).toBe(true)
  expect(shouldKeepOurs("packages/extension/webview-ui/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("packages/i18n/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("script/upstream/tsconfig.json", [])).toBe(true)
})

test("keeps explicitly configured files", () => {
  expect(shouldKeepOurs("README.md", ["README.md"])).toBe(true)
})

test("does not keep unrelated files", () => {
  expect(shouldKeepOurs("packages/cli/src/index.ts", [])).toBe(false)
})
