# See a UI change before it is published

Pushing to `main` publishes a new version, so a quick local loop matters.

## 1. Build a local package

```bash
cd packages/extension
bun run local:vsix
```

This bundles the extension and the webview and writes `qronos-code-local.vsix`.
The CLI binary is reused from `bin/` when it is already there, so a webview-only
change takes under a minute. Run `bun run prepare:cli-binary` first, once, so a
real binary exists.

## 2. Install it over the Marketplace copy

```bash
code --install-extension qronos-code-local.vsix --force
```

On a remote container or Codespaces run it as `code` inside the container, so the
package lands where the window looks for extensions.

## 3. Reload the window

Command palette → **Developer: Reload Window**, then open the Qronos panel.

Two ways to see the change without installing at all:

- **F5 dev host**: open `packages/extension` in VS Code and press F5
  (`bun run extension:isolated`). It starts a sandboxed window whenever the
  binary exists.
- **Storybook**: `bun run storybook` on port 6007 shows webview components with
  mocked data. Fastest for pure markup or style work.

## When you are happy with it

Push. The publish workflow notices that the current version is already live,
bumps the patch version, commits it with `[skip bump]`, and the next run builds
and publishes `linux-x64`, `win32-x64` and `darwin-arm64` together.
