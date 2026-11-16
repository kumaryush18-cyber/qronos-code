# Upstream: do we still take Kilo's updates?

Short answer: **we do not have to.** We own the code under MIT. Nobody sends us
updates, and nothing breaks if we never merge again.

## The three honest options

| Option | What it means | Cost | Risk |
|---|---|---|---|
| **A. No upstream** | We only ship our own changes. | Cheapest now | Every bug and security fix is ours, forever |
| **B. Cherry-pick** | We watch Kilo's repo and copy single fixes by hand (`git cherry-pick`, then fix conflicts). | ~1–2 h per fix | Medium |
| **C. Full merge** | Merge their `main` into ours every few months. | ~1 day each, growing | Highest, and impossible after a rename |

## Why a rename changes this

Today the folder names, package names and file paths are the same as Kilo's.
That is why option C is still cheap: git can match files. After the rename
phases in `RENAME_PLAN.md`, every file looks new to git, so a merge becomes a
manual rewrite of the same code. Option C basically dies.

## Recommendation

1. **Decide before the rename**, not after.
2. My advice: **B for security, A for features.** We take security fixes and
   serious bug fixes only, and we build our own features.
3. Keep `UPSTREAM.md` with a list of Kilo commits we picked, so we do not
   re-pick the same one twice.

## What we must always keep

- The MIT copyright lines of Kilo Code and OpenCode.
- A `NOTICE` file: "This product includes software developed by the Kilo Code
  and OpenCode projects, licensed under MIT."
- That is it. Attribution is not optional; merging is.

## How to keep an eye on upstream cheaply

```
git remote add upstream https://github.com/Kilo-Org/kilocode.git
git fetch upstream
git log --oneline main..upstream/main | head -50   # scan for "fix", "security", "cve"
```

Reading 50 commit subjects once a month is enough to find the fixes worth
copying.
