# Qronos Code — Full Rebrand & Fix Plan

> Status: living document. Owner: kumaryush18-cyber. Last updated: 2026-11-15.
> Baseline commit before this plan: `85eb887` (upstream Kilo), branch `rebrand/qronos-code`.
> Nothing in this repo is pushed to GitHub automatically.

---

## 0. The goal (in one paragraph)

**Qronos Code** must be a working, installable VS Code extension that is branded as
Qronos AI, talks only to the Qronos backend (`api.qronos.me`), signs users in with
GitHub Device Flow (10M daily tokens), shows Gravity AI sponsor cards, and shows
**no Kilo branding anywhere a user can see**. Built on the MIT-licensed Kilo Code
foundation. It must stay mergeable with upstream so future security fixes can be pulled.

---

## 1. Ground rules

1. Correctness first, renaming last. Never mass-rename before the build is green.
2. Every phase has a **gate**. Do not start the next phase until the gate passes.
3. No `git push` of new work unless the user asks for it explicitly.
4. Keep internal package names (`kilo-vscode`, `@qronos-ai/sdk`) — renaming folders is
   churn with zero user benefit and a large breakage surface.
5. Mark our own divergence from upstream with `qronos_change` comments, mirroring the
   existing `kilocode_change` convention.
6. Keep the original MIT copyright lines in `LICENSE`. Adding our own line is fine.

---

## 2. Known defects (audited 2026-11-15)

| # | Severity | Defect | Where |
|---|---|---|---|
| D1 | P0 | Webview typecheck fails: 4 message types not in the union | `webview-ui/src/types/messages.ts`, `QronosAuthBanner.tsx` |
| D2 | P0 | Backend contract mismatch — extension calls Kilo-shaped REST that `qronos-ai` does not serve | `packages/gateway/src/**` |
| D3 | P0 | REST base URL wrongly ends in `/v1` → every `/api/...` call becomes `/v1/api/...` = 404 | `kilo-gateway/src/api/constants.ts:11` |
| D4 | P1 | `QRONOS_AI_GATEWAY_URL` has no legacy fallback → `KILO_AI_GATEWAY_URL` ignored, e2e hits production | `kilo-gateway/src/api/constants.ts:17` |
| D5 | P1 | Hard-coded model IDs do not exist on the gateway (`claude-sonnet-5.5` vs `claude-5.5-sonnet`); defaults still `kilo-auto/free` | `provider-model.ts`, `constants.ts` |
| D6 | P1 | Two provider IDs (`kilo` + `qronos`) for one gateway → duplicate picker entries | `provider-model.ts` |
| D7 | P2 | 139 command IDs, 41 keybindings, 2 submenu IDs, 224 src refs still `qronos-code.*` | `package.json`, `src/**` |
| D8 | P2 | Settings namespace is `qronos-code.*` with title "Kilo Code" | `package.json` contributes.configuration |
| D9 | P2 | 91 user-visible "Kilo" strings in `en.ts`, 22 locale files | `webview-ui/src/i18n/**` |
| D10 | P2 | User-reachable Kilo URLs (feedback, credits, config schema, install, MCP metadata) | 18 hits across 3 packages |
| D11 | P2 | `.vsix` = 87 MB / 386 MB unpacked, ships `playwright-core` + `chromium-bidi` | `.vscodeignore` |
| D12 | P3 | Telemetry still PostHog (`us.i.posthog.com`) | `packages/telemetry` |

---

## 3. Phases

### Phase 0 — Safety net
- Branch `rebrand/qronos-code`, commit baseline, tag `pre-rebrand-baseline`.
- Record baseline: extension typecheck 0 errors, webview typecheck 4 errors.
- **Gate:** clean `git status`; tag exists.

### Phase 1 — Make the build gate green  *(D1)*
- Add the 4 request types (`qronosGetSession`, `qronosSignIn`, `qronosSetApiKey`,
  `qronosSignOut`) and the 2 reply types to the webview↔extension message union.
- **Gate:** both `tsgo --noEmit` runs exit 0; `bun run build:check` exits 0.

### Phase 2 — Backend contract  *(D2)*  — **DECISION TAKEN: Option A**
Option A = add Kilo-compatible routes to `qronos-ai`, so the extension stays close to
upstream and keeps pulling Kilo fixes.

Scope limited to three endpoints:
- `POST /api/device-auth/codes` and `GET /api/device-auth/codes/:code`
- `GET /api/profile` and `GET /api/profile/balance`
- `GET /api/users/notifications`

Out of scope on purpose: `/api/trpc/*`, `/api/marketplace`, `/api/organizations/:id/modes`
— these features are hidden in the extension instead of half-implemented.

- **Gate:** each route returns 200 with a real key; the extension shows balance and the
  device code without a 404.

### Phase 3 — URLs and model catalogue  *(D3, D4, D5)*
- REST base becomes `https://api.qronos.me` (no `/v1`); AI gateway base keeps `/v1`.
- Restore legacy env fallback for the gateway URL.
- Replace the hard-coded model list with `GET /v1/models` as the single source of truth;
  fix or remove `kilo-auto/free` defaults.
- **Gate:** `kilo-gateway/test/api/url.test.ts` passes (expectations updated);
  one chat message round-trips with no 404.

### Phase 4 — One provider ID, one model source  *(D6)*
Status: **next**. Detailed steps:

1. **Collapse the two gateway ids.** `provider-model.ts` currently exports both
   `KILO_PROVIDER_ID = "kilo"` and `QRONOS_PROVIDER_ID = "qronos"`, and the fallback
   provider is still `id: "kilo"`. Keep exactly one id (recommended: keep `kilo`, because
   the opencode engine, auth files and saved sessions are keyed on it) and delete
   `qronos` from `PROVIDER_PRIORITY` so the picker cannot show two groups.
2. **Delete the hard-coded model catalogue** in `createKiloFallbackProvider()`. The
   placeholder list already drifted once (wrong Claude ids). Serve it from
   `GET /v1/models` only; keep an empty object as the pre-fetch fallback.
3. **Verify the picker against the live catalogue** (`/v1/models`): every id shown must
   exist, and the default `claude-5.5-sonnet` must be selectable and answer a prompt.
4. **Hide Kilo-only surfaces** so no dead button and no stray request leaves the app:
   cloud sessions (`/api/trpc/*`), marketplace (`/api/marketplace`), organizations
   (`/api/organizations/:id/modes`), presence (already off via empty event URL),
   auto-routing (points at our own root and 404s).
5. **Decide the VS Code sign-in path.** `QronosAuthService` currently calls
   `qronos.me/auth/github/device` + `/auth/token` (the Qronos session shape), while the
   Kilo gateway client calls `/api/device-auth/codes` (the Kilo shape). Both must stay
   working, or we pick one and delete the other. Picking one is a 1-hour job and removes
   the CLI-key rotation side effect.

- **Gate:** one gateway group in the picker; every listed model answers; no request to
  any `*.kilo.*` host during a full session (checked in the network log).

### Phase 5 — Rename command IDs and settings namespace  *(D7, D8)*
- Scripted rename: manifest ids → keybindings → submenus → `src/**` → `tests/unit/**`.
- Do not touch `packages/cli/src`, `packages/core/src`, `packages/ui-kit/src`
  (verified: zero command-id references).
- **Gate:** zero `qronos-code.` command ids left in the extension package; `build:check` and
  `test:unit` pass; all 41 keybindings verified by hand.

### Phase 6 — Remove visible Kilo text  *(D9, D10)*
- Translate/fallback the i18n strings, prioritising device-auth, profile, sidebar label,
  indexing and gateway text. Non-English locales fall back to `en` until translated.
- Repoint feedback, credits, config schema, install and MCP URLs to Qronos domains.
- **Gate:** fresh profile walkthrough of every panel; no user-visible "Kilo".

### Phase 7 — Package and prove
- Trim `.vscodeignore` (target < 40 MB); rebuild `.vsix`; install into a clean profile.
- **Gate:** install + sign-in + one chat + no visible Kilo.

### Phase 8 — Publish
- Azure DevOps publisher `qronos-ai`, Marketplace PAT, `vsce publish`.
- **Gate:** extension findable on the Marketplace.

### Phase 9 — Upstream hygiene (ongoing)
- `qronos_change` markers on every divergence; periodic merge from `upstream`.

---

## 4. Open questions for the owner

1. Phase 5 timing: rename now (user count zero) or ship 1.0.0 and rename in 1.1.0?
   *Recommendation: now.*
2. Locales: translate 21 languages, or fall back to English? *Recommendation: fall back.*
3. Plan-billing / marketplace / modes features: keep pointing at Kilo or hide?
   *Recommendation: hide.*
4. Which models must be default and free? The catalogue must match `/v1/models` exactly.

---

## 5. History

- 2026-11-15: rebrand work started in `/workspaces/qronos-code`; manifest, icons, status bar,
  auth banner, Gravity ad and gateway URL edits done but uncommitted.
- 2026-11-15: audit found D1–D12; this plan written.
- 2026-11-15: **Phase 1 done.** Both typechecks green (extension + webview).
- 2026-11-15: **Phase 3 done.** REST root is now `https://api.qronos.me` (no `/v1`),
  gateway root keeps `/v1`; legacy env fallbacks restored; `parseServiceOrigin` crash on
  `DEFAULT_KILO_API_ORIGIN` fixed; Kilo-only hosts (auto-routing, presence) removed;
  model defaults and ids corrected to the live catalogue.
  kilo-gateway suite: **127 pass / 0 fail** (was 16 failing). opencode cloud defaults:
  11 failing → 8 failing (remaining ones belong to the Kilo-cloud feature we do not ship).
- 2026-11-15: **Phase 2 (Option A) code done.** `qronos-ai/server/qronosCompatApi.ts`
  adds the 5 Kilo-compatible routes; `QronosAuthService` normalises both backend
  response shapes (device_code/session_id, access_token/token, status:"pending").
  Full gate not yet passed: it needs D3 (the `/v1` base-URL fix) to be reachable.

- 2026-11-15: **Kilo removal + Phase 4 done** (commit `d5b499d`, `97dd0f8`).
  Provider id is `qronos` everywhere (core, catalog, auth store, config keys, model cache,
  routing, presence, sessions, indexes, tools, MCP client). `KILO_PROVIDER_ID` is now an
  alias of `QRONOS_PROVIDER_ID`, so one gateway group appears in the picker. Every
  hardcoded model list is gone: models come only from `GET /v1/models`, and the default
  selection is resolved from the user config plus the live catalog.
  Verified: core 23/23, opencode gateway-area 82/82, extension unit suite green apart from
  environment failures (esbuild `The service is no longer running` on the low-RAM box).
- 2026-11-15: **Phase 5 done** (commit `666d7f8`). 230 `kilo-code.*` command / menu / view /
  walkthrough / setting ids and labels renamed to `qronos-code.*` across manifest, source,
  webview, agent manager and tests; settings namespace `getConfiguration("qronos-code.new…")`;
  extension id references point at `qronos-ai.qronos-code`. Zero `kilo-code.*` left.
- 2026-11-15: first packaged build of the rebrand: `qronos-code-1.0.0.vsix` (83.4 MB,
  1,887 files). Bundle works again now that the box has memory.
