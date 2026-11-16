---
title: "Using the Qronos Code Provider"
description: "The built-in Qronos Code provider gives you access to top AI models with one account. Setup and sign-in guide."
sidebar_label: Qronos Code Provider
---

# Using Qronos Code's Built-in Provider

Qronos Code provides its own built-in API provider that gives you access to the latest frontier coding models through a simple registration process. No need to manage API keys from multiple providers - just sign up and start coding.

**Website:** [https://qronos.me/](https://qronos.me/)

## Getting Started

When you sign up for Qronos Code, you can start immediately with free models, or add credits to your account to access premium models.

1. **Sign up:** Complete the registration process
2. **Add credits:** Top up your account at [app.qronos.ai](https://qronos.me/profile)
3. **Start Coding:** Use 500+ models including the latest frontier coding models

## Registration Process

Qronos Code offers a streamlined registration that connects you directly to frontier coding models:

1. **Start Registration:** Click "Try Qronos Code for Free" in the extension
2. **Sign In:** Use your Google account to sign in at qronos.ai
3. **Authorize VS Code:**
   - qronos.ai will prompt you to open Visual Studio Code
   - For web-based IDEs, you'll copy the API key manually instead
4. **Complete Setup:** Allow VS Code to open the authorization URL when prompted

<!-- <img src="/img/setting-up/signupflow.gif" alt="Sign up and registration flow with Qronos Code" width="600" /> -->

## Supported Models

Qronos Code provides access to the latest frontier coding models through its built-in provider. The specific models available are automatically updated and managed by the Qronos Code service, ensuring you always have access to the most capable models for coding tasks.

## Qronos Gateway integration

Qronos Code routes requests through the Qronos Gateway for model access, usage tracking, and organization controls. For BYOK setup, provider routing, and full model availability, use the Gateway docs as the source of truth:

- [Qronos Gateway overview](/docs/gateway)
- [Models & Providers](/docs/gateway/models-and-providers)
- [Authentication & BYOK](/docs/gateway/authentication)

## Configuration in Qronos Code

Once you've completed the registration process, Qronos Code is automatically configured:

1. **Automatic Setup:** After successful registration, Qronos Code is ready to use immediately
2. **No API Key Management:** Your authentication is handled seamlessly through the registration process
3. **Model Selection:** Access to frontier models is provided automatically through your Qronos Code account

## Connected Accounts

With the Qronos Code provider, if you sign up with Google you can also connect other sign in accounts - like GitHub - by:

1. Go to your profile
2. Select [**Connected Accounts**](https://qronos.me/connected-accounts)
3. Under "Link a New account" select the type of account to link
4. Complete the OAuth authorization, and you'll see your connected accounts!

If you sign in with a new method whose email already belongs to a Qronos account, Qronos creates a short-lived pending link instead of stopping with an error. It asks you to confirm that you own the existing account before adding the method, using a code sent to the account's email address or a sign-in with a method the account already has. Nothing is attached until you confirm from the same browser or app; an email alone cannot approve the link.

<!-- <img src="/docs/img/qronos-provider/connected-accounts.png" alt="Connect account screen" width="600" /> -->

## Tips and Notes

- **Free Models:** New users can start with free models to explore Qronos Code's capabilities
- **Identity Verification:** The temporary hold system ensures service reliability while preventing misuse
- **Seamless Integration:** No need to manage multiple API keys or provider configurations
- **Latest Models:** Automatic access to the most current frontier coding models
- **Support Available:** Contact [hi@qronos.ai](mailto:hi@qronos.ai) for questions about pricing or tokens

For detailed setup instructions, see [Setting up Qronos Code](/docs/getting-started/setup-authentication).
