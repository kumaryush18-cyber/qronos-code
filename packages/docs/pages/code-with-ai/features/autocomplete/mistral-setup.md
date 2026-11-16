# Setting up Mistral for autocomplete

Use a Mistral API key with Qronos Gateway to run Codestral autocomplete through your own Mistral account.

Mistral's [Free mode includes limited usage](https://docs.mistral.ai/admin/billing-usage/usage-limits). Your account's plan, usage limits, and pay-as-you-go settings determine whether requests incur charges. Adding a BYOK key does not guarantee free autocomplete. Check [Mistral's current pricing](https://docs.mistral.ai/inference/pricing) before use.

## Prerequisites

- A [Qronos Code account](https://qronos.me)
- A [Mistral AI account](https://console.mistral.ai/)

## Step 1: Create a Mistral API key

1. Sign in to [Mistral AI Studio](https://console.mistral.ai/).
2. Open **API Keys** and click **Create new key**.
3. Complete the key settings and create the key.
4. Copy the key and store it securely. Mistral only shows the full key once.

Use a standard Studio API key. You do not need a separate Codestral key. See Mistral's [API key setup guide](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key) for the current console steps.

## Step 2: Add your key via BYOK in Qronos

1. Log into the [Qronos platform](https://qronos.me) and select the account or organization you use in the extension.
2. Open the [Bring Your Own Key (BYOK) page](https://qronos.me/byok), available in the sidebar under **Account**.
3. Click **Add Your First Key** or **Add Key** if you already have keys configured.
4. Select **Mistral AI** as the provider.
5. Paste your Mistral API key.
6. Click **Save**.

{% callout type="note" %}
If you previously added a **Legacy Codestral-only key**, Qronos Gateway gives that entry precedence over your Mistral AI key. Remove an obsolete legacy entry before retrying with your standard Mistral key.
{% /callout %}

For more details, see the [Bring Your Own Key documentation](/docs/getting-started/byok).

## Step 3: Verify autocomplete

1. Open VS Code with the Qronos Code extension installed and sign in to your Qronos account.
2. In Qronos Code settings, open **Models** and set **Autocomplete model** to **Codestral** under **Qronos Gateway**.
3. Start typing in a code file and check for inline suggestions.
4. Press `Tab` to accept a suggestion.

Qronos Gateway uses your saved Mistral AI key for these requests. Check usage in your Mistral account to confirm requests use that account's allowance or billing.

## How it works

Qronos Gateway sends autocomplete requests to Mistral using your BYOK key. Standard Mistral AI keys use Mistral's [FIM completions endpoint](https://docs.mistral.ai/api/endpoint/fim).

- Mistral applies your account's plan and usage limits.
- If your BYOK key is invalid, the request fails. Qronos does not fall back to its own keys.
- Without a matching BYOK key, Gateway autocomplete uses your Qronos credits.

## Troubleshooting

- **Autocomplete not appearing?** Check that autocomplete is enabled in Qronos Code settings and that you are signed in. Confirm the autocomplete model is Codestral under Qronos Gateway.
- **Key not working?** Check that you saved your standard Studio API key under **Mistral AI** in Qronos BYOK. Check for an expired key, account usage limits, or an obsolete legacy Codestral entry.
- **Seeing charges on your Qronos balance?** Confirm you added the key to the same Qronos account or organization used by the extension.

## Next steps

- Learn more about [autocomplete features](/docs/code-with-ai/features/autocomplete)
- Explore [triggering options](/docs/code-with-ai/features/autocomplete#triggering-options)
- Check [best practices](/docs/code-with-ai/features/autocomplete#best-practices)
