---
title: "Slack"
description: "Using Qronos Code in Slack"
---

# Qronos for Slack

**Qronos for Slack** brings Qronos Code directly into your Slack workspace. Ask questions about your repositories, request code implementations, debug issues, and collaborate with your team — all without leaving Slack.

When you mention `@Qronos` in a thread, the bot:

- Reads the full conversation
- Accesses your connected repositories
- Answers your question or spins up a Cloud Agent to implement the change
- Creates branches, pushes commits, and opens pull requests on your behalf

---

## What You Can Do

### Ask questions about your codebase

```
@Qronos what does the UserService class do in our main backend repo?
```

```
@Qronos how is error handling implemented in the payment processing module?
```

{% image src="/docs/img/connect/slack/slackbot-ask-questions.webp" alt="Asking Qronos a question about the codebase in Slack" width="800" /%}

### Implement fixes and features from Slack discussions

When your team identifies a bug or improvement in a thread, ask the bot to handle it:

```
@Qronos based on this thread, can you implement the fix for the null pointer exception in the order processing service?
```

The bot will:

- Read the thread context
- Understand the proposed solution
- Create a branch with the implementation
- Push a pull request to your repository

{% image src="/docs/img/connect/slack/slackbot-turn-discussions-into-PRs.webp" alt="Qronos turning a Slack thread discussion into a pull request" width="800" /%}

### Implement changes across multiple repositories

If the same change needs to land in several repos, just tell the bot:

```
@Qronos please fix this in the cloud, landing, and handbook repos
```

{% image src="/docs/img/connect/slack/slackbot-coding.webp" alt="Qronos implementing changes across multiple repositories from Slack" width="800" /%}

### Debug issues

Paste an error message or stack trace and ask for help:

```
@Qronos I'm seeing this error in production:
[paste error message]
Can you help me understand what's causing it?
```

{% image src="/docs/img/connect/slack/slackbot-bugs.webp" alt="Qronos helping debug a production error in Slack" width="800" /%}

---

## How to Interact

### Direct Messages

You can DM Qronos directly for private conversations. Find Qronos in your workspace's app list and start a direct message.

Good for:

- Private questions about your code
- Sensitive debugging sessions
- Personal productivity tasks

### Channel Mentions

Mention the bot in any channel where it's been added:

```
@Qronos can you explain how the authentication flow works in our backend?
```

Good for:

- Team discussions where AI assistance would help
- Collaborative debugging
- Getting quick answers during code reviews

---

## Prerequisites

Before using Qronos for Slack:

- You need a Qronos Code account with available credits
- Your Git provider integration (GitHub or GitLab) must be configured via the Integrations tab at [app.qronos.ai](https://qronos.me) so Qronos can access your repositories

---

## Setup

To install Qronos for Slack, go to the Integrations menu in the sidebar at [app.qronos.ai](https://qronos.me) and set up the Slack integration:

{% image src="/docs/img/connect/slack/slackbot-integrations.webp" alt="Qronos Integrations page where you install the Slack integration" width="800" /%}

Then hit the Configure button, which will take you to this page:
{% image src="/docs/img/connect/slack/slackbot-integrations-2.webp" alt="Qronos Integrations page where you install the Slack integration, step 2" width="800" /%}

Once you press "Connect with Slack", the Slack OAuth authorization page appears:
{% image src="/docs/img/connect/slack/slackbot-slack-authorize.webp" alt="Slack OAuth authorization page" width="800" /%}

Once this is completed you're good to go!

To make proper use of all of the Qronos Slack bot's capabilities, it's important that you also connect your source control provider with Qronos:

| Platform | Integration Type | Details |
|---|---|---|
| GitHub | GitHub App | [GitHub Setup Guide](/docs/automate/integrations#connecting-github) |
| GitLab | OAuth or PAT | [GitLab Setup Guide](/docs/automate/integrations#connecting-gitlab) |

---

## How It Works

1. **Message Qronos** through a DM or channel mention
2. **Qronos processes your request** using your connected repositories for context
3. **AI generates a response** analyzing your request and providing an answer
4. **Code changes (if requested)** — Qronos creates a branch, commits the changes, and opens a pull or merge request

---

## Changing the Model

You can customize which AI model Qronos uses for generating responses.

1. Go to your Qronos Workspace at [app.qronos.ai](https://qronos.me)
2. Navigate to **Integrations > Slack**
3. Select your preferred model

Qronos for Slack supports 400+ models across different providers. The new model applies immediately to subsequent requests.

---

## Cost

Qronos Code credits are used when Qronos performs work (model usage, operations, etc.). Credit usage is the same as using Qronos through any other interface.

---

## Tips for Best Results

- **Be specific.** The more context you provide, the better the response.
- **Reference specific files or functions.** Help the bot understand exactly what you're asking about.
- **Use threads.** Keep related conversations in threads for better context.
- **Specify the repository.** If you have multiple repos connected, mention which one you're asking about.

---

## Troubleshooting

**Qronos isn't responding.**
Make sure Qronos for Slack is installed in your workspace and has been added to the channel you're using.

**Qronos can't access my repository.**
Verify your Git provider integration is configured correctly in the Integrations tab.

**I'm getting incomplete responses.**
Try breaking your request into smaller, more specific questions.

**Qronos doesn't understand my codebase.**
Confirm that the repository you're asking about is connected and accessible through your Git provider integration.
