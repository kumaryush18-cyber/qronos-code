import { it } from "bun:test"
import { fixture } from "../fixtures/run"

it("survives switching between qronos-ui and upstream icon names", () => fixture("icon-registry-switch"), 30_000)
