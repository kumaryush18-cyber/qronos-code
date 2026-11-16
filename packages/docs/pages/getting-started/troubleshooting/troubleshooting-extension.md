---
title: "Troubleshooting IDE Extensions"
description: "How to capture console logs and report issues with Qronos Code"
---

# Capturing Console Logs

Providing console logs helps us pinpoint exactly what's going wrong with your installation, network, or MCP setup. This guide walks you through capturing those logs in your IDE.

## Opening Developer Tools

1. **Open the Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Search for Developer Tools**: Type `Developer: Open Webview Developer Tools` and select it

## Capturing the Error

Once you have the Developer Tools console open:

1. **Clear previous logs**: Click the "Clear Console" button (🚫 icon at the top of the Console panel) to remove old messages
2. **Reproduce the issue**: Perform the action that was causing problems
3. **Check for errors**: Look at the Console tab for error messages (usually shown in red). If you suspect connection issues, also check the **Network** tab
4. **Copy the logs**: Right-click in the console and select "Save as..." or copy the relevant error messages

## SQLite database is malformed

If every prompt fails with `SQLiteError: database disk image is malformed`, Qronos Code's local SQLite database may be corrupted. This database stores local Qronos state such as sessions and history.

### Find the database

When the qronos CLI uses the same environment as the affected installation, run `qronos db path` to print the selected database. See [Session History and Search](/docs/code-with-ai/agents/session-history) for normal database inspection and search workflows.

The default database location depends on where Qronos Code is running:

| Environment | Database path |
|---|---|
| Windows | `%USERPROFILE%\.local\share\qronos\qronos.db` |
| macOS | `~/.local/share/qronos/qronos.db` |
| Linux | `~/.local/share/qronos/qronos.db` |
| VS Code Remote SSH | `~/.local/share/qronos/qronos.db` on the remote machine |

{% callout type="warning" %}
When using VS Code Remote SSH, check the remote Linux machine, not your local Windows or macOS computer.
{% /callout %}

### Reset the database

Close VS Code or stop the Qronos backend first. On Linux or Remote SSH, run:

```bash
pkill -f "qronos serve"
mkdir -p ~/.local/share/qronos
mv ~/.local/share/qronos/qronos.db ~/.local/share/qronos/qronos.db.bak
mv ~/.local/share/qronos/qronos.db-wal ~/.local/share/qronos/qronos.db-wal.bak 2>/dev/null
mv ~/.local/share/qronos/qronos.db-shm ~/.local/share/qronos/qronos.db-shm.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Qronos Code recreates the database the next time it starts.

On Windows or macOS, rename the database file and any `qronos.db-wal` or `qronos.db-shm` files in the same folder, then restart the IDE.

{% callout type="warning" %}
Renaming this database resets local Qronos Code sessions and history for that machine. Keep the `.bak` files if you need to share them with support or attempt recovery later.
{% /callout %}

### Fully reset local Qronos data

If resetting the database does not fix the issue, you can fully reset Qronos Code's local data. This also removes local configuration and cache files, so use it only after trying the database reset above.

On Linux or VS Code Remote SSH, run this on the machine where Qronos Code is running:

```bash
pkill -f "qronos serve"
mv ~/.local/share/qronos ~/.local/share/qronos.bak 2>/dev/null
mv ~/.config/qronos ~/.config/qronos.bak 2>/dev/null
mv ~/.cache/qronos ~/.cache/qronos.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Qronos Code recreates these directories the next time it starts.

{% callout type="warning" %}
This resets local sessions, history, settings, and cached data. Prefer renaming the directories instead of deleting them so you can recover files. Remove secrets such as API keys or tokens before sharing any backup with support.
{% /callout %}

## Diagnosing WSL disconnects

If you use Qronos Code with VS Code on WSL and the extension repeatedly disconnects — VS Code shows "reconnecting" or the Qronos backend stops responding — capture a diagnostic bundle **before** restarting WSL or rebooting. A restart wipes most of the evidence.

1. Open any WSL terminal. An already-open Windows Terminal tab with your distribution works fine, even while VS Code is still reconnecting.

2. Paste this single command:

   ```bash
   OUT=/tmp/qronos-diag-$(date +%Y%m%dT%H%M%S) && mkdir -p $OUT && { echo "--- date"; date; echo "--- uptime"; uptime; echo "--- free"; free -h; echo "--- oom/kills"; sudo dmesg -T | grep -iE "oom|out of memory|killed process" | tail -60; } > $OUT/system.txt 2>&1; cp -r ~/.vscode-server/data/logs $OUT/vscode-logs 2>/dev/null; cp -r ~/.vscode-server-insiders/data/logs $OUT/vscode-insiders-logs 2>/dev/null; cp -r ~/.local/share/qronos/log $OUT/qronos-logs 2>/dev/null; tar czf /mnt/c/Users/Public/qronos-diag.tgz -C /tmp $(basename $OUT) && echo "Done -> C:\\Users\\Public\\qronos-diag.tgz"
   ```

   It may ask for your sudo password. The command collects kernel out-of-memory events, WSL VM uptime (which shows whether the whole VM restarted or just the VS Code server died), current memory stats, the VS Code remote server logs, and Qronos logs — nothing else.

   {% callout type="warning" %}
   Inspect the bundle before sharing it and remove any secrets such as API keys, tokens, prompts, or file paths. The bundle is written to `C:\Users\Public`, a folder shared with Windows so you can access it outside WSL — delete it once you're done sharing it.
   {% /callout %}

3. When it prints `Done`, send us the file `C:\Users\Public\qronos-diag.tgz` from Windows.

4. Include roughly how many Agent Manager sessions or worktrees were running in parallel when the disconnect happened.

## Contact Support

If you're unable to resolve the issue, please inspect the console logs, remove any secrets, and send the logs to **[hi@qronos.me](mailto:hi@qronos.me)** along with the following:

- The error messages from the console
- Steps to reproduce the issue
- Screenshots or screen recordings of the issue
- Your IDE and Qronos Code version
