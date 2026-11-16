---
"qronos-code": minor
"@qronos-ai/cli": minor
"@qronos-ai/sdk": minor
"@qronos-ai/gateway": minor
---

Retire the Mercury Edit 2 autocomplete models and Next Edit. Codestral is now the default autocomplete model, and saved Mercury or Inception selections use Codestral. The SDK no longer has `client.qronos.edit`, and `@qronos-ai/gateway` no longer exports `./edit` or `./edit-prompt`.
