# @qronos-ai/gateway

Unified Qronos Gateway package for OpenCode providing authentication, AI provider integration, and API access.

## Features

- **Authentication**: Device authorization flow for Qronos Gateway
- **AI Provider**: OpenRouter-based provider with Qronos Gateway integration
- **API Integration**: Profile, balance, and model management
- **TUI Helpers**: Utilities for terminal UI components

## Installation

```bash
bun add @qronos-ai/gateway
```

## Usage

### Plugin Registration

```typescript
import { QronosAuthPlugin } from "@qronos-ai/gateway"

// Register with OpenCode
const plugins = [QronosAuthPlugin]
```

### Provider Usage

```typescript
import { createQronos } from "@qronos-ai/gateway"

const provider = createQronos({
  qronosToken: process.env.QRONOS_API_KEY,
  qronosOrganizationId: "org-123",
})

const model = provider.languageModel("anthropic/claude-sonnet-4")
```

### API Access

```typescript
import { fetchProfile, fetchBalance } from "@qronos-ai/gateway"

const profile = await fetchProfile(token)
const balance = await fetchBalance(token)
```

## License

MIT
