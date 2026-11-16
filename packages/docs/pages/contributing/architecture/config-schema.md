---
title: "CLI Config Schema"
description: "How CLI runtime config and editor-facing JSON Schema stay aligned"
---

# CLI Config Schema

Qronos config has two related but separate paths:

- Qronos CLI runtime loads and merges config locally.
- Cloud-served JSON Schema gives editors validation and completion for `qronos.json` and `qronos.jsonc`.

JSON Schema does not load, apply, or override runtime config.

```jsonc
{
  "$schema": "https://qronos.me/config.json"
}
```

## Two separate paths

```mermaid
flowchart LR
  subgraph runtime ["Runtime config loading"]
    files["Global, project, organization,<br/>managed, and runtime config sources"] --> loader["Qronos CLI config loader"] --> effective["Effective runtime config"]
  end

  subgraph schema ["Editor validation and completion"]
    info["Config.Info<br/>Effect Schema"] --> generated["Locally generated schema<br/>for verification"]
    upstream["https://opencode.ai/config.json"] --> overlay["Qronos Cloud merge route"]
    extras["Qronos extras.ts overlay buckets"] --> overlay --> endpoint["https://qronos.me/config.json"] --> editor["Editor validation and completion"]
    generated -. "Keep aligned" .-> extras
  end
```

Changing runtime config precedence affects first path. Adding or changing config key affects both paths because editor schema must describe keys CLI accepts. See [CLI Runtime config precedence](/docs/contributing/architecture/cli-runtime#config-precedence) for runtime merge order.

## Source of truth

Canonical CLI config source is Effect Schema `Config.Info` in `packages/cli/src/config/config.ts` in [`Qronos-Org/qronos`](https://github.com/Qronos-Org/qronos). CLI derives `.zod` compatibility surface from Effect Schema for plugin and SDK consumers. Do not maintain separate handwritten Zod definition for Qronos config fields.

## Cloud schema endpoint

Static source review of [`Qronos-Org/cloud`](https://github.com/Qronos-Org/cloud) shows this route behavior:

1. Editor fetches `https://qronos.me/config.json` because config file references `$schema`.
2. Cloud route `apps/web/src/app/config.json/route.ts` fetches `https://opencode.ai/config.json`.
3. Route runs `merge()` and returns upstream schema with Qronos additions and overrides.
4. `merge()` overlays buckets from `apps/web/src/app/config.json/extras.ts`.

Cloud source defines 1-hour upstream revalidation and edge-cache headers. This describes checked-in route behavior, not live deployment or cache state.

## Overlay buckets

Reviewed cloud source overlays:

| Bucket | Purpose |
|---|---|
| `top` | Top-level Qronos keys and overrides |
| `agents` | Qronos primary agents under `agent` |
| `experimental` | Qronos experimental keys under `experimental` |

Nested CLI fields outside these buckets need dedicated overlay bucket and matching `merge()` logic.

## Failure mode

If cloud overlay misses valid CLI field, CLI can accept config while editor reports `unknown property`. Opposite drift is also possible: cloud schema can advertise field that runtime no longer accepts.

Treat schema synchronization as cross-repository contract. Tests should detect both missing valid fields and stale overlay entries. Keep branch-specific drift findings in tracked issues or test output, not this architecture page.

## Adding or changing Qronos-only config key

1. Add or update Effect Schema field with `qronos_change` marker in `packages/cli/src/config/config.ts`.
2. Generate JSON Schema shape:

```sh
bun --bun packages/cli/script/schema.ts /tmp/qronos.json
jq '.properties.<new_key>' /tmp/qronos.json
```

3. Update matching bucket in `apps/web/src/app/config.json/extras.ts` in [cloud repo](https://github.com/Qronos-Org/cloud).
4. Extend `merge()` in `apps/web/src/app/config.json/route.ts` when new nested bucket is required.
5. Add assertion in `apps/web/src/tests/cli-config-schema.test.ts`.
6. Audit stale overlay entries as well as missing additions.

{% callout type="warning" title="Cross-repository change" %}
CLI schema source lives in `Qronos-Org/qronos`. Public editor schema overlay lives in `Qronos-Org/cloud`. Config-key change is incomplete until both repositories agree.
{% /callout %}

## Source map

Repository column identifies source root for each relative path.

| Repository | Source path | Role |
|---|---|---|
| `Qronos-Org/qronos` | `packages/cli/src/config/config.ts` | Canonical Effect Schema and derived `.zod` surface |
| `Qronos-Org/cloud` | `apps/web/src/app/config.json/route.ts` | Cloud overlay route |
| `Qronos-Org/cloud` | `apps/web/src/app/config.json/extras.ts` | Qronos overlay buckets |
| `Qronos-Org/cloud` | `apps/web/src/tests/cli-config-schema.test.ts` | Cloud schema assertions |

## Related pages

- [CLI Runtime](/docs/contributing/architecture/cli-runtime#config-precedence) - runtime config loading and precedence
- [Development Patterns](/docs/contributing/architecture/development-patterns) - shared-file markers, Qronos-owned boundaries, and cross-repository contributor workflow
