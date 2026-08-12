---
name: cli
description: Maintain package installer, updater, and release behavior.
---

# CLI

Use for changes under `cli/`.

## Layout

- `cli/src/index.ts`: command parsing and exit codes.
- `cli/src/catalog-installation.ts`: source-to-consumer copy and conflict handling.
- `cli/src/repository-state.ts`: initialization, manifest, and consumer config ownership.
- `cli/scripts/copy-loops.mjs`: copies source `loops/` into package payload before packing.
- `cli/loops/`: generated package payload. Do not edit directly.

## Install and update rules

- Recommend `npx @plainconceptsplatform/workflows@latest platform-workflows <init|add|update>` for all one-off use. Mention `pnpm exec platform-workflows <init|add|update>` only for a project-local development dependency.
- Document `PlainConceptsPlatform/opencode-onboard` as a consumer prerequisite because loop workers invoke the skills and commands it provides. Require verification that required skills and commands are available before workflow compilation.
- `init` creates consumer config only when absent.
- `add` and `update` manage package-owned actions, workflows, and compile script.
- Preserve `.github/workflows/shared/repo-config.md` on every operation.
- Detect differing package-managed targets as conflicts. Return them without writes unless `--force` is explicit.
- Exclude generated `*.lock.yml` and `actions-lock.json` from package copying. Consumers compile their own locks.

## Package and release

Before release, copy loops, build, typecheck, and test. `prepack` must refresh `cli/loops/`; published files include only `dist` and `loops`. Publish only through declared `release` script after checks pass.
