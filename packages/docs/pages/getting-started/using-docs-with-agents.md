---
title: "Using Qronos Docs with Agents"
description: "Access the full Qronos Code documentation in machine-readable formats for LLMs and AI agents"
---

# Using Qronos Docs with Agents

You can access the full text of the Qronos Code documentation in machine-readable formats suitable for LLMs and AI agents. This is useful when you want an AI assistant to reference Qronos Code's documentation while helping you with a task.

## Full documentation

The complete documentation is available as a single text file at:

```
https://qronos.me/docs/llms.txt
```

This file contains the full content of every page in the Qronos Code docs, formatted for easy consumption by language models.

## Individual pages

You can also fetch any individual documentation page as raw Markdown via the API:

```
https://qronos.me/docs/api/raw-markdown?path=<url-encoded-path>
```

For example, to fetch the "Code with AI" overview page:

```
https://qronos.me/docs/api/raw-markdown?path=%2Fcode-with-ai
```

The `path` parameter should be the URL-encoded path of the documentation page, without the `/docs` prefix.
