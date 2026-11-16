import { describe, expect, test } from "bun:test"
import { QronosMcpConfig } from "@/qronos/cli/cmd/mcp"

const added = `{
  "permission": {
    "bash": "allow"
  },
  "mcp": {
    "linear": {
      "type": "remote",
      "url": "https://mcp.linear.app/mcp",
      "oauth": {}
    }
  },
}`

describe("QronosMcpConfig.format", () => {
  test("writes strict JSON for qronos.json", () => {
    const output = QronosMcpConfig.format("/tmp/qronos.json", added)

    expect(JSON.parse(output)).toEqual({
      permission: { bash: "allow" },
      mcp: {
        linear: {
          type: "remote",
          url: "https://mcp.linear.app/mcp",
          oauth: {},
        },
      },
    })
    expect(output).not.toEndWith(",\n}")
  })

  test("preserves JSONC formatting for qronos.jsonc", () => {
    expect(QronosMcpConfig.format("/tmp/qronos.jsonc", added)).toBe(added)
  })
})
