# Dedicated Output Channel

**Priority:** P2

Agent Manager has its own output channel. No general "Qronos Code" output channel exists.

## Remaining Work

- Create `vscode.window.createOutputChannel("Qronos Code")` during activation
- Centralized logging utility with log levels (debug, info, warn, error)
- Route all `[Qronos New]` log messages to this channel
- Dispose on deactivation
- Migrate existing `console.log("[Qronos New] ...")` calls to the logger
