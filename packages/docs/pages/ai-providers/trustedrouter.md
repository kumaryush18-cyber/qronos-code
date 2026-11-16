---
title: "Using TrustedRouter with Qronos Code | Attested AI Router"
description: "Configure TrustedRouter in Qronos Code through its OpenAI-compatible API for attested routing, zero-data-retention routing, and encrypted model routes."
sidebar_label: TrustedRouter
---

# Using TrustedRouter With Qronos Code

TrustedRouter exposes an OpenAI-compatible API at `https://api.trustedrouter.com/v1`.
You can use it from Qronos Code with the built-in TrustedRouter provider.

**Website:** [https://trustedrouter.com/](https://trustedrouter.com/)

## Getting an API Key

1. Sign in to the [TrustedRouter console](https://trustedrouter.com/console).
2. Open [API keys](https://trustedrouter.com/console/api-keys).
3. Create a key and copy it.

## Configuration in Qronos Code

{% tabs %}
{% tab label="VSCode" %}

Open **Settings** (gear icon), go to the **Providers** tab, choose **TrustedRouter**, and enter your API key.

Then select a TrustedRouter model such as `trustedrouter/auto`, `trustedrouter/zdr`, or `trustedrouter/e2e`.

{% /tab %}
{% tab label="CLI" %}

**Method 1 — `/connect` (recommended)**

Run `qronos`, then use the `/connect` command, select **TrustedRouter**, and paste your API key when prompted:

```bash
qronos
# then, inside Qronos, run:
/connect
```

**Method 2 — config file**

Set the API key as an environment variable:

```bash
export TRUSTEDROUTER_API_KEY="your-api-key"
```

Then configure the built-in TrustedRouter provider in your `qronos.json` file:

```jsonc
{
  "provider": {
    "trustedrouter": {
      "env": ["TRUSTEDROUTER_API_KEY"],
      "models": {
        "auto": {
          "name": "TrustedRouter Auto"
        },
        "zdr": {
          "name": "TrustedRouter ZDR"
        },
        "e2e": {
          "name": "TrustedRouter E2E"
        }
      }
    }
  },
  "model": "trustedrouter/auto"
}
```

{% /tab %}
{% /tabs %}

## Common Models

- `trustedrouter/auto` routes across healthy supported providers.
- `trustedrouter/zdr` prefers zero-data-retention routes.
- `trustedrouter/e2e` uses end-to-end encrypted routes where available.

## Tips and Notes

- TrustedRouter uses the OpenAI-compatible chat completions API.
- You can verify the hosted gateway and attestation story at [https://trust.trustedrouter.com/](https://trust.trustedrouter.com/).
- To use a specific model instead of a router alias, add it under `provider.trustedrouter.models` and select it in Qronos Code.
