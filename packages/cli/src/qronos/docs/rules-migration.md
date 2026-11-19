# Qronos Rules Migration

This document explains how Qronos rules are automatically migrated to Opencode's `instructions` config array.

## Overview

Qronos stores rules in various file locations. When Opencode starts, it reads these files and injects their paths into the `instructions` config array, which Opencode then loads as part of the system prompt.

## Key Guarantees

### 1. Read-Only Migration

The migration **never modifies project files**. We only:

- Read existing rule files from disk
- Inject file paths into the config's `instructions` array
- Never write to the project or modify any files

### 2. Combines with Existing Config (Never Overwrites)

If you have existing qronos config with `instructions`, the Qronos rules are **combined**, not replaced:

```typescript
// Example: User has opencode.json with:
{ "instructions": ["AGENTS.md", "custom-rules.md"] }

// Qronos rules add:
{ "instructions": [".qronosrules", ".qronos/rules/coding.md"] }

// Result (combined, deduplicated):
{ "instructions": ["AGENTS.md", "custom-rules.md", ".qronosrules", ".qronos/rules/coding.md"] }
```

### 3. Restart to Pick Up Changes

If you change your Qronos configuration (e.g., edit `.qronosrules`), simply restart qronos-cli to pick up the new config. No manual migration or conversion needed.

## Source Locations

The migrator reads rules from these locations:

### Project Rules

| Location | Description |
|---|---|
| `.qronosrules` | Legacy single-file rules in project root |
| `.qronos/rules/*.md` | Directory-based rules (multiple markdown files) |
| `.qronosrules-{mode}` | Mode-specific legacy rules (e.g., `.qronosrules-code`) |
| `.qronos/rules-{mode}/*.md` | Mode-specific rule directories |

### Global Rules

| Location | Description |
|---|---|
| `~/.qronos/rules/*.md` | Global rules directory |

## File Mapping

| Qronos Location | Opencode Equivalent |
|---|---|
| `.qronosrules` | `instructions: [".qronosrules"]` |
| `.qronosrules-{mode}` | `instructions: [".qronosrules-{mode}"]` |
| `.qronos/rules/*.md` | `instructions: [".qronos/rules/file.md", ...]` |
| `.qronos/rules-{mode}/*.md` | `instructions: [".qronos/rules-{mode}/file.md", ...]` |
| `~/.qronos/rules/*.md` | `instructions: ["~/.qronos/rules/file.md", ...]` |

## AGENTS.md Compatibility

`AGENTS.md` is loaded **natively** by Opencode - no migration needed. Opencode automatically loads:

- `AGENTS.md` in project root
- `CLAUDE.md` in project root
- `~/.config/qronos/AGENTS.md` (global)

## Not Migrated

The following are **not** migrated:

- `.roorules` - Roo-specific rules
- `.clinerules` - Cline-specific rules

Only Qronos-specific files (`.qronosrules`, `.qronos/rules/`) are migrated.

## Mode-Specific Rules

Mode-specific rules (e.g., `.qronosrules-code`, `.qronos/rules-architect/`) are included by default. All mode-specific rules are loaded regardless of the current mode.

## Warnings

The migrator generates warnings for:

- **Legacy files**: When `.qronosrules` is found, a warning suggests migrating to `.qronos/rules/` directory structure

## Example

### Before (Qronos)

```
project/
├── .qronosrules           # Legacy rules
├── .qronosrules-code      # Code-mode specific
└── .qronos/
    └── rules/
        ├── coding.md        # Coding standards
        └── testing.md       # Testing guidelines
```

### After (Opencode Config)

```json
{
  "instructions": [
    "/path/to/project/.qronos/rules/coding.md",
    "/path/to/project/.qronos/rules/testing.md",
    "/path/to/project/.qronosrules",
    "/path/to/project/.qronosrules-code"
  ]
}
```

## Troubleshooting

### Rules not appearing

1. Check the file exists at the expected location
2. Ensure markdown files have `.md` extension
3. Restart qronos-cli to pick up changes

### Duplicate rules

The `mergeConfigConcatArrays` function automatically deduplicates the `instructions` array using `Array.from(new Set([...]))`.

## Related Files

- [`rules-migrator.ts`](../rules-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection
- [`modes-migration.md`](./modes-migration.md) - Modes migration documentation
