import { describe, it, expect } from "bun:test"

// vscode mock is provided by the shared preload (tests/setup/vscode-mock.ts)
const { QronosCodeActionProvider } = await import("../../src/services/code-actions/code-action-provider")

const provider = new QronosCodeActionProvider()

function makeRange(isEmpty: boolean) {
  return { isEmpty }
}

function makeContext(diagnosticCount: number) {
  return { diagnostics: Array.from({ length: diagnosticCount }) }
}

describe("QronosCodeActionProvider", () => {
  describe("provideCodeActions", () => {
    it("returns empty array when range is empty", () => {
      const result = provider.provideCodeActions({} as never, makeRange(true) as never, makeContext(0) as never)
      expect(result).toEqual([])
    })

    it("returns empty array when range is empty even with diagnostics", () => {
      const result = provider.provideCodeActions({} as never, makeRange(true) as never, makeContext(3) as never)
      expect(result).toEqual([])
    })

    describe("non-empty range, no diagnostics", () => {
      it("returns Add, Explain, Improve actions", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(0) as never)
        const titles = result.map((a) => a.title)
        expect(titles).toContain("Add to Qronos Code")
        expect(titles).toContain("Explain with Qronos Code")
        expect(titles).toContain("Improve with Qronos Code")
      })

      it("does not include Fix action", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(0) as never)
        expect(result.map((a) => a.title)).not.toContain("Fix with Qronos Code")
      })

      it("returns exactly 3 actions", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(0) as never)
        expect(result).toHaveLength(3)
      })

      it("uses correct command IDs", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(0) as never)
        const commands = result.map((a) => a.command?.command)
        expect(commands).toContain("qronos-code.new.addToContext")
        expect(commands).toContain("qronos-code.new.explainCode")
        expect(commands).toContain("qronos-code.new.improveCode")
      })

      it("no action is preferred", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(0) as never)
        expect(result.every((a) => !a.isPreferred)).toBe(true)
      })
    })

    describe("non-empty range, with diagnostics", () => {
      it("returns Add and Fix actions", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(2) as never)
        const titles = result.map((a) => a.title)
        expect(titles).toContain("Add to Qronos Code")
        expect(titles).toContain("Fix with Qronos Code")
      })

      it("does not include Explain or Improve actions", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(1) as never)
        const titles = result.map((a) => a.title)
        expect(titles).not.toContain("Explain with Qronos Code")
        expect(titles).not.toContain("Improve with Qronos Code")
      })

      it("returns exactly 2 actions", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(1) as never)
        expect(result).toHaveLength(2)
      })

      it("Fix action is preferred", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(1) as never)
        const fix = result.find((a) => a.title === "Fix with Qronos Code")
        expect(fix?.isPreferred).toBe(true)
      })

      it("Fix action uses QuickFix kind", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(1) as never)
        const fix = result.find((a) => a.title === "Fix with Qronos Code")
        expect(fix?.kind.value).toBe("quickfix")
      })

      it("uses correct Fix command ID", () => {
        const result = provider.provideCodeActions({} as never, makeRange(false) as never, makeContext(1) as never)
        const fix = result.find((a) => a.title === "Fix with Qronos Code")
        expect(fix?.command?.command).toBe("qronos-code.new.fixCode")
      })
    })
  })
})
