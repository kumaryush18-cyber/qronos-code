// @ts-nocheck

import { OpenCode } from "@qronos-ai/core"
import { ReadTool } from "@qronos-ai/core/tools"

const qronos = OpenCode.make({})

qronos.tool.add(ReadTool)

qronos.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

qronos.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

qronos.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await qronos.session.create({
  agent: "build",
})

qronos.subscribe((event) => {
  console.log(event)
})

await qronos.session.prompt({
  sessionID,
  text: "hey what is up",
})

await qronos.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await qronos.session.wait()

console.log(await qronos.session.messages(sessionID))
