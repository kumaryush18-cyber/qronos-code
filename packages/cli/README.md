# Qronos Code CLI

The AI coding agent built for the terminal. Generate code from natural language, automate tasks, and run terminal commands -- powered by 500+ AI models.

![Qronos CLI showing code edits in a terminal](https://raw.githubusercontent.com/Qronos-Org/qronos/main/packages/docs/public/img/npm-package-readme/qronos-cli.png)

Qronos is the all-in-one agentic engineering platform. Build, ship, and iterate faster with the most popular open source coding agent.

[Website](https://qronos.me) · [Install](https://qronos.me/install) · [IDE](https://qronos.me/landing/vs-code) · [CLI](https://qronos.me/cli) · [Docs](https://qronos.me/docs) · [Models](https://qronos.me/leaderboard) · [Gateway](https://qronos.me/gateway) · [Pricing](https://qronos.me/pricing) · [Qronos Pass](https://qronos.me/pricing/qronos-pass)

[500+ models](https://qronos.me/leaderboard). One open source agent in [VS Code](https://qronos.me/vscode-marketplace), [JetBrains](https://plugins.jetbrains.com/plugin/27133-qronos-code), [CLI](https://www.npmjs.com/package/@qronos-ai/cli), [Slack](https://qronos.me/slack), and [Cloud](https://qronos.me/cloud).

## Install

```bash
npm install -g @qronos-ai/cli
```

Or run directly with npx:

```bash
npx --package @qronos-ai/cli qronos
```

## Getting Started

Run `qronos` in any project directory to launch the interactive TUI:

```bash
qronos
```

Run a one-off task:

```bash
qronos run "add input validation to the signup form"
```

## Features

- **Code generation** -- describe what you want in natural language
- **Terminal commands** -- the agent can run shell commands on your behalf
- **500+ AI models** -- use models from OpenAI, Anthropic, Google, and more
- **MCP servers** -- extend agent capabilities with the Model Context Protocol
- **Multiple modes** -- Plan with Architect, code with Coder, debug with Debugger, or create your own
- **Sessions** -- resume previous conversations and export transcripts
- **API keys optional** -- bring your own keys or use Qronos credits

## Commands

| Command               | Description                |
| --------------------- | -------------------------- |
| `qronos`                | Launch interactive TUI     |
| `qronos run "<task>"`   | Run a one-off task         |
| `qronos auth`           | Manage authentication      |
| `qronos models`         | List available models      |
| `qronos mcp`            | Manage MCP servers         |
| `qronos session list`   | List sessions              |
| `qronos session delete` | Delete a session           |
| `qronos export`         | Export session transcripts |

Run `qronos --help` for the full list.

## Alternative Installation

### Homebrew (macOS/Linux)

```bash
brew install Qronos-Org/tap/qronos
```

### GitHub Releases

Download pre-built binaries from the [Releases page](https://github.com/Qronos-Org/qronos/releases).

## Documentation

- [Docs](https://qronos.me/docs)
- [Getting Started](https://qronos.me/docs/getting-started)

## Links

- [GitHub](https://github.com/Qronos-Org/qronos)
- [Discord](https://qronos.me/discord)
- [VS Code Extension](https://qronos.me/vscode-marketplace)
- [Website](https://qronos.me)

## License

MIT
