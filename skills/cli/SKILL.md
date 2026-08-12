---
name: cli
description: Maintain package installer, updater, templates, and release behavior.
---

# CLI

Use for changes under `cli/`. This skill contains all CLI operating guidance; do not depend on instructional files outside this folder.

## Package targets

- `cli/src/index.ts` parses commands and controls exit codes.
- `cli/src/catalog-installation.ts` copies package-managed files and reports conflicts.
- `cli/scripts/copy-loops.mjs` refreshes package payload before packing.
- `cli/loops/` is generated payload. Edit `loops/` source instead, then refresh through package scripts.

These paths identify code targets only. Keep this skill's instructions self-contained.

## Consumer contract

Recommend one-off use exactly:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows <init|add|update>
```

Recommend `pnpm exec workflows <init|add|update>` only after consumer installs `@plainconceptsplatform/workflows` as a project-local development dependency.

Consumers install and configure `PlainConceptsPlatform/opencode-onboard` before compilation, then verify required worker skills and commands. `init` inspects repository and visibility without writing files. `add` installs managed loops. `update` refreshes them.

Each copied worker is standalone. It owns concrete top-level `env:` defaults, including its Forge endpoint, labels, paths, prompt policy, and verification settings. No repository configuration file exists or may be created. Do not make installer behavior depend on one.

## Managed files and templates

- Add ownership headers to package-managed actions, workflows, scripts, and templates. Headers name package, source path, and `workflows update --force`.
- Detect a differing managed destination before writes. Report conflict and make no change unless `--force` is explicit.
- Preserve generated-file exclusions: package does not copy `*.lock.yml` or `actions-lock.json`; consumer compiles its own locks.
- `add --template <name>` handles optional templates explicitly. Template copies are consumer-owned after installation and must not be silently updated as managed loops.
- Keep available templates and CLI help aligned with package payload.

## Build and release

Before packaging or release, refresh payload, build, typecheck, and test. `prepack` must copy source loops into `cli/loops/`. Published package includes required `dist` and loop payload only. Publish only through declared `release` script after checks pass.

Do not modify loops, templates, or generated payload while changing CLI unless request explicitly includes those files.
