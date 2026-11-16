---
title: "Qronos Connect"
description: "Use Qronos Code from Slack, GitHub, and Linear, and connect DoltHub data"
---

# Qronos Connect

**Qronos Connect** brings Qronos Code into the tools your team already uses. Instead of switching to a separate interface, you can trigger implementations, ask questions, and get pull requests opened from your chat, issue tracker, or code review workflow. You can also connect DoltHub as a data source for Dolt-versioned data.

---

## Supported Integrations

| Integration | Entry Point | What It Can Do |
|---|---|---|
| [Slack](/docs/code-with-ai/platforms/slack) | `@Qronos` in any channel or DM | Ask questions, implement fixes, debug issues |
| [GitHub](/docs/code-with-ai/platforms/github) | `@qronos-bot` on issues and PRs | Fix issues, review code, cross-repo changes |
| [Linear](/docs/code-with-ai/platforms/linear) | `@qronos` on any issue | Implement fixes, investigate bugs, cross-repo changes |
| DoltHub | [Connect DoltHub](https://qronos.me/integrations/dolthub) from Integrations | Query Dolt-versioned data and authorize DoltHub access for Gas Town Wasteland |

---

## How to Set Up

All integrations are configured from the **Integrations** tab at [app.qronos.ai](https://qronos.me). Each integration requires:

- A Qronos Code account with available credits
- The specific integration installed and authorized for your workspace
- A connected Git provider (GitHub or GitLab) for repository workflows such as Cloud Agents, Code Reviews, and Qronos Deploy
